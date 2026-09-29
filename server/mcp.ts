import { readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createMcpHandler, McpServer, type CallToolResult } from '@modelcontextprotocol/server'
import type { BoneRotations, SceneDocument } from '../src/types/index.ts'
import { checkGoal, resolveChains, solveIk, type PoseFrame } from '../src/utils/ik.ts'
import { NoBrowserError, type BridgeClient } from './bridge.ts'
import { rendersDir } from './home.ts'
import { buildPoseSpec } from './poseSpec.ts'
import { JOINT_IDS, jointPositionsSchema, reachSchema, renderViewsSchema, sceneSchema } from './sceneSchema.ts'
import { POSEREF_VERSION } from './version.ts'

const RENDERS_KEPT = 20
const DEFAULT_VIEWS = ['current', 'front', 'left'] as const
const DEFAULT_VIEW_SIZE = 480
/** A contact within 2 cm reads as touching in the render. */
const REACHED_WITHIN = 0.02

const INSTRUCTIONS = `PoseRef controls a posable mannequin and camera in the user's browser to build pose and composition reference images.
The tools open the PoseRef page in the browser by themselves when no tab is connected. When the user asks to open or show PoseRef, call open_poseref.
Call get_pose_spec once before your first set_scene: it explains the bone axes and sign conventions, which are easy to get wrong.
Before posing, decide which way the character acts (a target, a direction) and keep that direction across the picture so the action reads in silhouette; aiming, throwing and swinging are done side-on (see the spec's "Composition and readability").
Then loop: set_scene -> render_views -> compare with the request and check the silhouette from the 'current' view -> adjust. When the request has body parts touching (hand on hip, elbow on knee, hands together), set the rough pose first and then place the contacts with reach (inverse kinematics) instead of guessing angles; confirm with get_joint_positions and only report contact the numbers show. set_scene puts the body on the floor automatically. Stop after two or three rounds when the pose is roughly right; the user fine-tunes by hand and can undo your changes in the app.`

function text(value: string): CallToolResult {
  return { content: [{ type: 'text', text: value }] }
}

/** One-line JSON without zero rotations; bones left out are 0, matching set_scene's 'replace' mode. */
function compactScene(scene: SceneDocument): string {
  const bones = Object.fromEntries(
    Object.entries(scene.pose?.bones ?? {}).filter(([, r]) => r && (r.x !== 0 || r.y !== 0 || r.z !== 0)),
  )
  return JSON.stringify({ ...scene, pose: { ...scene.pose, bones } })
}

/**
 * Runs a browser request. When no tab is connected, opens the page (the bridge
 * rate-limits automatic opening) and tries once more, so a closed tab does not
 * leave the agent stuck asking the user.
 */
async function withTab<T>(bridge: BridgeClient, call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    if (!(error instanceof NoBrowserError)) throw error
    const opened = await bridge.open(true)
    if (opened.tabs === 0) throw error
    return await call()
  }
}

function failure(error: unknown): CallToolResult {
  return { content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true }
}

/**
 * Saves the review image to a file as well. Clients that cannot show MCP image
 * content to the model (some Codex versions) can open the file instead.
 */
async function saveRender(pngBase64: string): Promise<string> {
  const dir = rendersDir()
  const path = join(dir, `review-${new Date().toISOString().replace(/[:.]/g, '-')}.png`)
  await writeFile(path, Buffer.from(pngBase64, 'base64'))
  const files = (await readdir(dir)).filter((name) => name.endsWith('.png')).sort()
  await Promise.all(files.slice(0, -RENDERS_KEPT).map((name) => rm(join(dir, name), { force: true })))
  return path
}

/** The PoseRef tools, working through any bridge: in-process for HTTP, remote for stdio. */
export function createPoseRefMcpServer(bridge: BridgeClient): McpServer {
  const server = new McpServer({ name: 'poseref', version: POSEREF_VERSION }, { instructions: INSTRUCTIONS })

  server.registerTool(
    'get_pose_spec',
    {
      title: 'Get pose authoring guide',
      description: 'Returns the guide to PoseRef bones, axis conventions, grounding, camera and example poses. Read it before the first set_scene.',
      annotations: { readOnlyHint: true },
    },
    async () => text(buildPoseSpec()),
  )

  server.registerTool(
    'get_scene',
    {
      title: 'Get current scene',
      description: 'Returns the current pose, character transform, camera and aspect ratio from the open PoseRef tab as JSON. Bones not listed have zero rotation.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        return text(compactScene(await withTab(bridge, () => bridge.request('getScene', {}))))
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'set_scene',
    {
      title: 'Set pose and camera',
      description:
        'Applies a pose, character transform, camera and/or aspect ratio to the open PoseRef tab in one undoable step. Omitted sections are left unchanged. ' +
        'When a pose is given, the hips are moved so the body rests on the floor (turn off with pose.ground = false). Returns the resulting scene. Follow up with render_views to check the result.',
      inputSchema: sceneSchema,
    },
    async (scene) => {
      try {
        const { scene: applied, groundShift } = await withTab(bridge, () => bridge.request('setScene', { version: 1, ...scene }))
        const grounding =
          groundShift === null
            ? ''
            : groundShift === 0
              ? ' Already resting on the floor.'
              : ` Grounded: hips moved ${groundShift > 0 ? 'up' : 'down'} by ${Math.abs(groundShift)} m so the lowest body point rests on the floor.`
        return text(`Applied.${grounding} Current scene (bones not listed are 0): ${compactScene(applied)}`)
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'render_views',
    {
      title: 'Render review views',
      description:
        "Renders the scene from several views side by side in one labeled PNG so you can check the pose. 'current' shows the user's camera and composition. The image is also saved to a file whose path is returned.",
      inputSchema: renderViewsSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ views, size }) => {
      try {
        const result = await withTab(bridge, () =>
          bridge.request('renderViews', {
            views: views ?? [...DEFAULT_VIEWS],
            size: size ?? DEFAULT_VIEW_SIZE,
          }),
        )
        const path = await saveRender(result.pngBase64)
        return {
          content: [
            { type: 'image', data: result.pngBase64, mimeType: 'image/png' },
            { type: 'text', text: `Rendered ${result.width}x${result.height} px. Saved to ${path}` },
          ],
        }
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'get_joint_positions',
    {
      title: 'Get joint positions',
      description:
        `Returns world positions in meters of joint landmarks (${JOINT_IDS.join(', ')}), the height of the lowest body point (lowestY, 0 = on the floor), and distances for the requested pairs. ` +
        'Use it to check contact instead of judging from the picture: joint landmarks sit inside the limbs, so two limbs touch when their distance is about the sum of the limb radii ' +
        '(elbow resting on knee ~0.11 m); chin and nose are on the head surface, so a palm touches the chin at ~0.03-0.06 m.',
      inputSchema: jointPositionsSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ pairs }) => {
      try {
        const report = await withTab(bridge, () => bridge.request('getJoints', {}))
        const distances = (pairs ?? []).map(([a, b]) => {
          const p = report.joints[a]
          const q = report.joints[b]
          const d = p && q ? Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) : NaN
          return { from: a, to: b, distance: Math.round(d * 1000) / 1000 }
        })
        return text(JSON.stringify({ lowestY: report.lowestY, distances, joints: report.joints }))
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'reach',
    {
      title: 'Move joints to targets (IK)',
      description:
        'Inverse kinematics: rotates bones so a landmark (effector) moves onto another landmark or a world point, e.g. an elbow onto a knee or a palm under the chin. ' +
        'Elbows and knees only bend the natural way and the torso and head stay within natural limits. Only the chain bones change, except that the upper arm or thigh above a chained elbow or knee may twist about its own length, which keeps that joint in place; the result is one undoable step. ' +
        'Set the rough pose with set_scene first, then use reach for contacts, then render_views to check.',
      inputSchema: reachSchema,
    },
    async ({ goals, ground }) => {
      try {
        const scene = await withTab(bridge, () => bridge.request('getScene', {}))
        const frame: PoseFrame = {
          bones: scene.pose!.bones as BoneRotations,
          rootOffset: scene.pose!.rootOffset!,
          characterPosition: scene.character!.position!,
          characterYaw: scene.character!.yaw!,
        }
        const chains = resolveChains(goals)
        for (const [index, goal] of goals.entries()) {
          const problem = checkGoal(goal, chains[index])
          if (problem) return failure(new Error(problem))
        }
        const result = solveIk(frame, goals, chains)
        const bones = Object.fromEntries(result.changed.map((bone) => [bone, result.bones[bone]]))
        const { groundShift } = await withTab(bridge, () =>
          bridge.request('setScene', { version: 1, pose: { mode: 'merge', bones, ground } }),
        )

        const lines = result.goals.map(
          (goal) =>
            `- ${goal.effector}: ${goal.error <= REACHED_WITHIN ? 'reached' : 'NOT reached'}, ${goal.error} m from the target (rotated ${goal.chain.join(', ')})`,
        )
        const missed = result.goals.some((goal) => goal.error > REACHED_WITHIN)
        const advice = missed
          ? '\nA target out of reach leaves the limb pointing at it but short. Move the body closer first (lean the chest, bend the legs), ' +
            "add a parent bone such as chest to that goal's chain, or add a goal that moves the other body part toward this one."
          : ''
        const grounding = groundShift ? `\nGrounded: hips moved ${groundShift > 0 ? 'up' : 'down'} by ${Math.abs(groundShift)} m.` : ''
        return text(`${lines.join('\n')}${advice}${grounding}\nNew rotations: ${JSON.stringify(bones)}`)
      } catch (error) {
        return failure(error)
      }
    },
  )

  server.registerTool(
    'open_poseref',
    {
      title: 'Open PoseRef',
      description:
        "Starts PoseRef if it is not running and opens it in the user's browser. Does nothing when a PoseRef tab is already open. " +
        'Use it when the user asks to open or show PoseRef; the other tools also open the page on their own when no tab is connected.',
      // Opens a browser window, so not read-only; calling it again is harmless.
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const result = await bridge.open(false)
        const started = result.startedServer ? 'Started the PoseRef server. ' : ''
        if (result.tabs > 0 && !result.opened) {
          return text(`${started}PoseRef is already open at ${result.url} (${result.tabs} tab${result.tabs === 1 ? '' : 's'}).`)
        }
        if (result.tabs > 0) return text(`${started}Opened PoseRef at ${result.url}.`)
        if (result.disabled) {
          return text(`${started}Did not open a browser because POSEREF_NO_OPEN is set. Ask the user to open ${result.url}.`)
        }
        return text(`${started}Opened ${result.url}, but the page has not connected yet. Ask the user to check the browser window.`)
      } catch (error) {
        return failure(error)
      }
    },
  )

  return server
}

/** Stateless Streamable HTTP handler: every request gets a fresh McpServer bound to the shared bridge. */
export function createPoseRefMcpHandler(bridge: BridgeClient) {
  return createMcpHandler(() => createPoseRefMcpServer(bridge))
}
