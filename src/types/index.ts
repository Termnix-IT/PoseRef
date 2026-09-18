/** 3D vector (also used for Euler angles in degrees). */
export interface Vec3 {
  x: number
  y: number
  z: number
}

export type Axis = keyof Vec3

/** Bones that can be posed by the user. */
export type BoneId =
  | 'hips'
  | 'chest'
  | 'neck'
  | 'head'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftUpperArm'
  | 'rightUpperArm'
  | 'leftForearm'
  | 'rightForearm'
  | 'leftHand'
  | 'rightHand'
  | 'leftThigh'
  | 'rightThigh'
  | 'leftLowerLeg'
  | 'rightLowerLeg'

/** Rotation of every bone in degrees (Euler XYZ). */
export type BoneRotations = Record<BoneId, Vec3>

export interface BoneDef {
  id: BoneId
  label: string
  parent: BoneId | null
  /** Pivot position relative to the parent pivot (meters). */
  offset: Vec3
}

export type PartShape =
  | { kind: 'capsule'; radius: number; length: number }
  | { kind: 'ellipsoid'; radius: Vec3 }
  | { kind: 'cylinder'; radiusTop: number; radiusBottom: number; height: number }

export interface PartDef {
  bone: BoneId
  shape: PartShape
  /** Position relative to the bone pivot. */
  position: Vec3
  /** Rotation in degrees. */
  rotation?: Vec3
}

export type PosePresetId =
  | 'tPose'
  | 'standing'
  | 'armsCrossed'
  | 'peaceSign'
  | 'running'
  | 'sitting'
  | 'lookingBack'
  | 'fightingPose'

export interface PosePreset {
  id: PosePresetId
  label: string
  /** Bones not listed default to zero rotation. */
  bones: Partial<BoneRotations>
  /** Extra offset applied to the hips root (e.g. lowering the body when sitting). */
  rootOffset?: Vec3
}

export interface PoseState {
  bones: BoneRotations
  rootOffset: Vec3
  presetId: PosePresetId | 'custom'
}

export interface CharacterState {
  position: Vec3
  /** Rotation around the Y axis in degrees. */
  yaw: number
  color: string
}

export interface CameraState {
  fov: number
  position: Vec3
  target: Vec3
}

export type CameraPresetId =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'highAngle'
  | 'lowAngle'
  | 'threeQuarter'

export interface CameraPreset {
  id: CameraPresetId
  label: string
  position: Vec3
  target: Vec3
}

export type AspectRatioId = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

export interface AspectRatioOption {
  id: AspectRatioId
  label: string
  /** Base export size (1024px basis). */
  width: number
  height: number
}

export type BackgroundId = 'white' | 'gray' | 'black' | 'transparent'

export interface BackgroundOption {
  id: BackgroundId
  label: string
  /** Scene clear color; null means transparent. */
  color: string | null
  gridCellColor: string
  gridSectionColor: string
  /** Color shown behind the canvas in the viewport UI. */
  previewColor: string
}

export type ExportScale = 1 | 2

export interface ExportOptions {
  width: number
  height: number
}

/** Renders the current scene at the requested size and returns a PNG blob. */
export type ExportRenderer = (options: ExportOptions) => Promise<Blob>

export type PromptLanguage = 'ja' | 'en'
