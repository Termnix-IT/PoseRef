import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMcpHandler, McpServer, type CallToolResult } from '@modelcontextprotocol/server'
import type { SceneDocument } from '../src/types/index.ts'
import type { BrowserBridge } from './bridge.ts'
import { buildPoseSpec } from './poseSpec.ts'
import { renderViewsSchema, sceneSchema } from './sceneSchema.ts'

const RENDER_DIR = join(tmpdir(), 'poseref-renders')
const RENDERS_KEPT = 20
const DEFAULT_VIEWS = ['current', 'front', 'left'] as const
const DEFAULT_VIEW_SIZE = 480

const INSTRUCTIONS = `PoseRef controls a posable mannequin and camera in the user's browser to build pose and composition reference images.
Call get_pose_spec once before your first set_scene: it explains the bone axes and sign conventions, which are easy to get wrong.
Then loop: set_scene -> render_views -> compare with the request -> adjust. Stop after two or three rounds when the pose is roughly right; the user fine-tunes by hand and can undo your changes in the app.`

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

function failure(error: unknown): CallToolResult {
  return { content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true }
}

/**
 * Saves the review image to a temp file as well. Clients that cannot show MCP
 * image content to the model (some Codex versions) can open the file instead.
 */
async function saveRender(pngBase64: string): Promise<string> {
  await mkdir(RENDER_DIR, { recursive: true })
  const path = join(RENDER_DIR, `review-${new Date().toISOString().replace(/[:.]/g, '-')}.png`)
  await writeFile(path, Buffer.from(pngBase64, 'base64'))
  const files = (await readdir(RENDER_DIR)).filter((name) => name.endsWith('.png')).sort()
  await Promise.all(files.slice(0, -RENDERS_KEPT).map((name) => rm(join(RENDER_DIR, name), { force: true })))
  return path
}

function createServer(bridge: BrowserBridge): McpServer {
  const server = new McpServer({ name: 'poseref', version: '0.1.0' }, { instructions: INSTRUCTIONS })

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
        return text(compactScene(await bridge.request('getScene', {})))
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
        'Applies a pose, character transform, camera and/or aspect ratio to the open PoseRef tab in one undoable step. Omitted sections are left unchanged. Returns the resulting scene. Follow up with render_views to check the result.',
      inputSchema: sceneSchema,
    },
    async (scene) => {
      try {
        const applied = await bridge.request('setScene', { version: 1, ...scene })
        return text(`Applied. Current scene (bones not listed are 0): ${compactScene(applied)}`)
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
        const result = await bridge.request('renderViews', {
          views: views ?? [...DEFAULT_VIEWS],
          size: size ?? DEFAULT_VIEW_SIZE,
        })
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

  return server
}

/** Stateless Streamable HTTP handler: every request gets a fresh McpServer bound to the shared bridge. */
export function createPoseRefMcpHandler(bridge: BrowserBridge) {
  return createMcpHandler(() => createServer(bridge))
}
