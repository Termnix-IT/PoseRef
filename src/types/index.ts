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
  | 'handsOnHips'
  | 'armsCrossed'
  | 'handsBehindBack'
  | 'modelPose'
  | 'lookingBack'
  | 'peaceSign'
  | 'waving'
  | 'pointing'
  | 'thinking'
  | 'salute'
  | 'cheering'
  | 'handsBehindHead'
  | 'walking'
  | 'running'
  | 'jumping'
  | 'fightingPose'
  | 'sitting'
  | 'kneeHug'
  | 'kneeling'
  | 'seiza'
  | 'crouching'
  | 'lyingDown'

export type PoseGroupId = 'standing' | 'gesture' | 'action' | 'sitting'

export interface PosePreset {
  id: PosePresetId
  /** Japanese label shown in the UI. */
  label: string
  /** English label used in the English prompt. */
  labelEn: string
  group: PoseGroupId
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

/**
 * What a left drag on the mannequin does.
 * 'camera' always orbits; 'pose' rotates the grabbed bone instead.
 */
export type InteractionMode = 'camera' | 'pose'

/**
 * Scene description exchanged with AI agents through the MCP bridge. Every
 * section is optional; omitted sections leave the current state untouched.
 * The server validates and normalizes it before it reaches the browser.
 */
export interface SceneDocument {
  version?: 1
  pose?: {
    /** 'replace' (default) zeroes every bone not listed; 'merge' keeps them. */
    mode?: 'replace' | 'merge'
    bones?: Partial<BoneRotations>
    rootOffset?: Vec3
    /**
     * Default true: after the pose is applied, the hips are raised or lowered so
     * the lowest body point rests on the floor. False keeps rootOffset as given.
     */
    ground?: boolean
  }
  character?: { yaw?: number; position?: Vec3 }
  camera?: { position?: Vec3; target?: Vec3; fov?: number }
  aspectRatio?: AspectRatioId
}

/** A named point on the mannequin, given in the local space of the bone it moves with. */
export interface JointLandmark {
  id: string
  bone: BoneId
  offset: Vec3
  /** Bones the IK tool rotates by default to move this point, root side first. */
  ikChain: BoneId[]
}

/** World positions (meters) of the joint landmarks, as reported to AI agents. */
export interface JointReport {
  joints: Record<string, Vec3>
  /** Height of the lowest point of the body; 0 means it rests on the floor. */
  lowestY: number
}

export type JointReader = () => JointReport

/** Views the agent can ask for. All but 'current' are framed on the character and follow its yaw. */
export type ReviewViewId = 'current' | 'front' | 'back' | 'left' | 'right' | 'top'

/** Renders the requested views side by side into one labeled PNG. */
export type ReviewRenderer = (views: ReviewViewId[], size: number) => Promise<Blob>

export type AgentBridgeStatus = 'connecting' | 'connected' | 'disconnected'

/** State that the undo history restores. */
export interface SceneSnapshot {
  pose: PoseState
  character: CharacterState
  camera: CameraState
  aspectRatio: AspectRatioId
}

export interface BoneHandleDef {
  /** Position of the handle in the bone's local space. */
  offset: Vec3
  /**
   * Sphere radius. Chosen per joint so the handle stays wider than the limb
   * around it: a handle buried inside the body is neither visible nor clickable.
   */
  radius: number
}
