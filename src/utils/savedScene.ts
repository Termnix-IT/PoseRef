import { ASPECT_RATIOS } from '../constants/aspectRatios.ts'
import { BACKGROUNDS } from '../constants/backgrounds.ts'
import { BONE_IDS, DEFAULT_MANNEQUIN_COLOR, MANNEQUIN_COLORS } from '../constants/bones.ts'
import { CAMERA_PRESETS } from '../constants/cameraPresets.ts'
import { POSE_PRESETS } from '../constants/posePresets.ts'
import { SCENE_RANGES } from '../constants/sceneRanges.ts'
import type {
  AspectRatioId,
  BackgroundId,
  BoneRotations,
  CameraPresetId,
  CameraState,
  CharacterState,
  ExportScale,
  PoseState,
  PromptLanguage,
  Vec3,
} from '../types/index.ts'

/** Bump when the saved shape changes; older data is then ignored rather than misread. */
export const SAVED_SCENE_VERSION = 1

/** What the browser keeps between visits: the scene plus a few output preferences. */
export interface SavedSceneState {
  pose: PoseState
  character: CharacterState
  camera: CameraState
  activeCameraPreset: CameraPresetId | 'custom'
  aspectRatio: AspectRatioId
  background: BackgroundId
  showGrid: boolean
  showShadow: boolean
  exportScale: ExportScale
  promptLanguage: PromptLanguage
  includePromptDetails: boolean
  /** AI連携 stays on across reloads once the user turned it on in this browser. */
  agentEnabled: boolean
}

export const SAVED_SCENE_KEYS = [
  'pose',
  'character',
  'camera',
  'activeCameraPreset',
  'aspectRatio',
  'background',
  'showGrid',
  'showShadow',
  'exportScale',
  'promptLanguage',
  'includePromptDetails',
  'agentEnabled',
] as const satisfies ReadonlyArray<keyof SavedSceneState>

type Range = { min: number; max: number }

/** Picks the saved fields from a larger state object (the store). */
export function pickSavedScene(state: SavedSceneState): SavedSceneState {
  return Object.fromEntries(SAVED_SCENE_KEYS.map((key) => [key, state[key]])) as unknown as SavedSceneState
}

export function serializeSavedScene(state: SavedSceneState): string {
  return JSON.stringify({ version: SAVED_SCENE_VERSION, ...pickSavedScene(state) })
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const inRange = (value: unknown, range: Range): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= range.min && value <= range.max

function vec3(value: unknown, x: Range, y: Range = x, z: Range = x): Vec3 | null {
  if (!isRecord(value) || !inRange(value.x, x) || !inRange(value.y, y) || !inRange(value.z, z)) return null
  return { x: value.x, y: value.y, z: value.z }
}

function oneOf<T extends string | number>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null
}

function parsePose(value: unknown): PoseState | null {
  if (!isRecord(value) || !isRecord(value.bones)) return null
  const bones = {} as BoneRotations
  for (const id of BONE_IDS) {
    const rotation = vec3(value.bones[id], SCENE_RANGES.angle)
    if (!rotation) return null
    bones[id] = rotation
  }
  const rootOffset = vec3(value.rootOffset, SCENE_RANGES.rootOffset)
  if (!rootOffset) return null
  const presetId = oneOf(value.presetId, POSE_PRESETS.map((preset) => preset.id)) ?? 'custom'
  return { bones, rootOffset, presetId }
}

function parseCharacter(value: unknown): CharacterState | null {
  if (!isRecord(value) || !inRange(value.yaw, SCENE_RANGES.angle)) return null
  const position = vec3(value.position, SCENE_RANGES.characterX, SCENE_RANGES.characterY, SCENE_RANGES.characterZ)
  if (!position) return null
  const color = oneOf(value.color, MANNEQUIN_COLORS.map((option) => option.value)) ?? DEFAULT_MANNEQUIN_COLOR
  return { position, yaw: value.yaw, color }
}

/** Minimum distance between the camera and its look-at point; closer than this the orbit has no direction. */
const MIN_CAMERA_DISTANCE = 0.01
/**
 * Orbiting and zooming can carry the camera past the ±10 m the position fields
 * accept (it may be up to 12 m from a look-at point that is itself up to 4 m
 * out), so a saved camera only has to be a sane number, not inside that range.
 */
const SAVED_CAMERA_POSITION: Range = { min: -100, max: 100 }

function parseCamera(value: unknown): CameraState | null {
  if (!isRecord(value) || !inRange(value.fov, SCENE_RANGES.fov)) return null
  const position = vec3(value.position, SAVED_CAMERA_POSITION)
  const target = vec3(value.target, SCENE_RANGES.cameraTarget)
  if (!position || !target) return null
  const distance = Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z)
  if (distance < MIN_CAMERA_DISTANCE) return null
  return { fov: value.fov, position, target }
}

/**
 * Reads what `serializeSavedScene` wrote. Anything unreadable, from another
 * version, or out of range is dropped field by field, so a damaged entry
 * never stops the app from starting; dropped fields keep their defaults.
 */
export function parseSavedScene(raw: string | null): Partial<SavedSceneState> {
  if (!raw) return {}
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!isRecord(data) || data.version !== SAVED_SCENE_VERSION) return {}

  const candidates: { [K in keyof SavedSceneState]: SavedSceneState[K] | null } = {
    pose: parsePose(data.pose),
    character: parseCharacter(data.character),
    camera: parseCamera(data.camera),
    activeCameraPreset: data.activeCameraPreset === 'custom' ? 'custom' : oneOf(data.activeCameraPreset, CAMERA_PRESETS.map((preset) => preset.id)),
    aspectRatio: oneOf(data.aspectRatio, ASPECT_RATIOS.map((option) => option.id)),
    background: oneOf(data.background, BACKGROUNDS.map((option) => option.id)),
    showGrid: typeof data.showGrid === 'boolean' ? data.showGrid : null,
    showShadow: typeof data.showShadow === 'boolean' ? data.showShadow : null,
    exportScale: oneOf(data.exportScale, [1, 2] as const),
    promptLanguage: oneOf(data.promptLanguage, ['ja', 'en'] as const),
    includePromptDetails: typeof data.includePromptDetails === 'boolean' ? data.includePromptDetails : null,
    agentEnabled: typeof data.agentEnabled === 'boolean' ? data.agentEnabled : null,
  }
  // A saved camera only matches its preset if the camera itself was kept.
  if (!candidates.camera) candidates.activeCameraPreset = null

  return Object.fromEntries(Object.entries(candidates).filter(([, value]) => value !== null)) as Partial<SavedSceneState>
}
