import * as z from 'zod'
import { ASPECT_RATIOS } from '../src/constants/aspectRatios.ts'
import { BONE_IDS, JOINT_LANDMARKS } from '../src/constants/bones.ts'
import { CAMERA_POSITION_RANGE, CAMERA_TARGET_RANGE, FOV_RANGE } from '../src/constants/cameraPresets.ts'
import type { AspectRatioId, BoneId, ReviewViewId, SceneDocument } from '../src/types/index.ts'
import { normalizeDegrees } from '../src/utils/math.ts'

/** Accepted ranges. They match the UI sliders so anything an agent sets can also be edited by hand. */
export const RANGES = {
  angle: { min: -360, max: 360 },
  rootOffset: { min: -1.5, max: 1.5 },
  characterX: { min: -3, max: 3 },
  characterY: { min: -1, max: 2 },
  characterZ: { min: -3, max: 3 },
  cameraPosition: CAMERA_POSITION_RANGE,
  cameraTarget: CAMERA_TARGET_RANGE,
  fov: FOV_RANGE,
}

const between = (range: { min: number; max: number }) => z.number().min(range.min).max(range.max)

const vec3 = (x: { min: number; max: number }, y = x, zRange = x) =>
  z.strictObject({ x: between(x), y: between(y), z: between(zRange) })

const angle = between(RANGES.angle).transform(normalizeDegrees)

/** Missing axes mean 0, so `{ "x": -90 }` is enough to lift a thigh. */
const rotation = z.strictObject({
  x: angle.default(0),
  y: angle.default(0),
  z: angle.default(0),
})

const boneIds = BONE_IDS as [BoneId, ...BoneId[]]
const aspectRatioIds = ASPECT_RATIOS.map((option) => option.id) as [AspectRatioId, ...AspectRatioId[]]

export const sceneSchema = z.strictObject({
  version: z.literal(1).optional().describe('Scene format version. Always 1.'),
  pose: z
    .strictObject({
      mode: z
        .enum(['replace', 'merge'])
        .optional()
        .describe("'replace' (default): bones not listed are reset to 0. 'merge': bones not listed keep their current rotation."),
      bones: z
        .partialRecord(z.enum(boneIds), rotation)
        .optional()
        .describe('Per-bone local Euler XYZ rotation in degrees. See get_pose_spec for axis conventions.'),
      rootOffset: vec3(RANGES.rootOffset)
        .optional()
        .describe('Offset of the hips in meters. y is adjusted by grounding unless ground is false.'),
      ground: z
        .boolean()
        .optional()
        .describe(
          'Default true: after applying, raise or lower the hips so the lowest body point rests on the floor. Set false for jumps or other airborne poses.',
        ),
    })
    .optional(),
  character: z
    .strictObject({
      yaw: between(RANGES.angle).transform(normalizeDegrees).optional().describe('Whole-body turn in degrees. 0 faces +Z.'),
      position: vec3(RANGES.characterX, RANGES.characterY, RANGES.characterZ).optional(),
    })
    .optional(),
  camera: z
    .strictObject({
      position: vec3(RANGES.cameraPosition).optional().describe('Camera position in meters.'),
      target: vec3(RANGES.cameraTarget).optional().describe('Point the camera looks at, in meters.'),
      fov: between(RANGES.fov).optional().describe('Vertical field of view in degrees.'),
    })
    .optional(),
  aspectRatio: z.enum(aspectRatioIds).optional().describe('Output image aspect ratio.'),
})

// Keeps the schema and the browser-side type from drifting apart.
export type ParsedScene = z.output<typeof sceneSchema>
const _sceneTypeCheck: SceneDocument = {} as ParsedScene
void _sceneTypeCheck

export const REVIEW_VIEWS = ['current', 'front', 'back', 'left', 'right', 'top'] as const satisfies readonly ReviewViewId[]

export const renderViewsSchema = z.strictObject({
  views: z
    .array(z.enum(REVIEW_VIEWS))
    .min(1)
    .max(6)
    .optional()
    .describe(
      "Views to render side by side. 'current' is the user's camera and composition; the others are framed on the character and follow its yaw. Default: current, front, left.",
    ),
  size: z.number().int().min(256).max(768).optional().describe('Height of each view in pixels. Default 480.'),
})

export const JOINT_IDS = JOINT_LANDMARKS.map((landmark) => landmark.id) as [string, ...string[]]

export const jointPositionsSchema = z.strictObject({
  pairs: z
    .array(z.tuple([z.enum(JOINT_IDS), z.enum(JOINT_IDS)]))
    .max(20)
    .optional()
    .describe('Joint pairs to measure, e.g. [["rightElbow","rightKnee"],["rightPalm","chin"]]. Distances are returned in meters.'),
})
