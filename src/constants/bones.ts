import type { BoneDef, BoneHandleDef, BoneId, BoneRotations, JointLandmark, PartDef, Vec3 } from '../types/index.ts'

/** Base height of the hips pivot above the floor (meters). */
export const HIPS_BASE_Y = 0.94

/**
 * Bone hierarchy. Pivots are expressed relative to the parent pivot.
 * The character faces +Z, +X is the left side of the character, +Y is up.
 * Limb meshes extend along local -Y from their pivot.
 */
export const BONES: BoneDef[] = [
  { id: 'hips', label: '腰', parent: null, offset: { x: 0, y: HIPS_BASE_Y, z: 0 } },
  { id: 'chest', label: '胸', parent: 'hips', offset: { x: 0, y: 0.07, z: 0 } },
  { id: 'neck', label: '首', parent: 'chest', offset: { x: 0, y: 0.43, z: 0 } },
  { id: 'head', label: '頭', parent: 'neck', offset: { x: 0, y: 0.08, z: 0 } },
  { id: 'leftShoulder', label: '左肩', parent: 'chest', offset: { x: 0.07, y: 0.38, z: 0 } },
  { id: 'rightShoulder', label: '右肩', parent: 'chest', offset: { x: -0.07, y: 0.38, z: 0 } },
  { id: 'leftUpperArm', label: '左上腕', parent: 'leftShoulder', offset: { x: 0.14, y: 0, z: 0 } },
  { id: 'rightUpperArm', label: '右上腕', parent: 'rightShoulder', offset: { x: -0.14, y: 0, z: 0 } },
  { id: 'leftForearm', label: '左前腕', parent: 'leftUpperArm', offset: { x: 0, y: -0.28, z: 0 } },
  { id: 'rightForearm', label: '右前腕', parent: 'rightUpperArm', offset: { x: 0, y: -0.28, z: 0 } },
  { id: 'leftHand', label: '左手', parent: 'leftForearm', offset: { x: 0, y: -0.26, z: 0 } },
  { id: 'rightHand', label: '右手', parent: 'rightForearm', offset: { x: 0, y: -0.26, z: 0 } },
  { id: 'leftThigh', label: '左太もも', parent: 'hips', offset: { x: 0.095, y: -0.06, z: 0 } },
  { id: 'rightThigh', label: '右太もも', parent: 'hips', offset: { x: -0.095, y: -0.06, z: 0 } },
  { id: 'leftLowerLeg', label: '左すね', parent: 'leftThigh', offset: { x: 0, y: -0.4, z: 0 } },
  { id: 'rightLowerLeg', label: '右すね', parent: 'rightThigh', offset: { x: 0, y: -0.4, z: 0 } },
]

export const BONE_MAP: Record<BoneId, BoneDef> = Object.fromEntries(
  BONES.map((bone) => [bone.id, bone]),
) as Record<BoneId, BoneDef>

export const BONE_IDS: BoneId[] = BONES.map((bone) => bone.id)

export const ROOT_BONE: BoneId = 'hips'

export function childrenOf(boneId: BoneId): BoneDef[] {
  return BONES.filter((bone) => bone.parent === boneId)
}

/** Layout used by the bone picker UI: center bones, then left/right pairs. */
export const BONE_PICKER_CENTER: BoneId[] = ['head', 'neck', 'chest', 'hips']
export const BONE_PICKER_PAIRS: Array<{ label: string; left: BoneId; right: BoneId }> = [
  { label: '肩', left: 'leftShoulder', right: 'rightShoulder' },
  { label: '上腕', left: 'leftUpperArm', right: 'rightUpperArm' },
  { label: '前腕', left: 'leftForearm', right: 'rightForearm' },
  { label: '手', left: 'leftHand', right: 'rightHand' },
  { label: '太もも', left: 'leftThigh', right: 'rightThigh' },
  { label: 'すね', left: 'leftLowerLeg', right: 'rightLowerLeg' },
]

/**
 * Drag handles, one per bone, in that bone's local space. Each sits at the far
 * end of its bone, so grabbing the elbow swings the upper arm and grabbing the
 * wrist swings the forearm. The torso handles are moved to the sternum and the
 * nape where nothing hides them. The hips have no handle: rotating them turns
 * the whole body, which is what the pelvis mesh and the Yaw slider are for.
 */
export const BONE_HANDLES: Partial<Record<BoneId, BoneHandleDef>> = {
  chest: { offset: { x: 0, y: 0.3, z: 0.145 }, radius: 0.05 },
  neck: { offset: { x: 0, y: 0.05, z: -0.085 }, radius: 0.042 },
  head: { offset: { x: 0, y: 0.06, z: 0.18 }, radius: 0.042 },
  leftShoulder: { offset: { x: 0.14, y: 0, z: 0 }, radius: 0.058 },
  rightShoulder: { offset: { x: -0.14, y: 0, z: 0 }, radius: 0.058 },
  leftUpperArm: { offset: { x: 0, y: -0.28, z: 0 }, radius: 0.058 },
  rightUpperArm: { offset: { x: 0, y: -0.28, z: 0 }, radius: 0.058 },
  leftForearm: { offset: { x: 0, y: -0.26, z: 0 }, radius: 0.052 },
  rightForearm: { offset: { x: 0, y: -0.26, z: 0 }, radius: 0.052 },
  leftHand: { offset: { x: 0, y: -0.18, z: 0 }, radius: 0.04 },
  rightHand: { offset: { x: 0, y: -0.18, z: 0 }, radius: 0.04 },
  leftThigh: { offset: { x: 0, y: -0.4, z: 0 }, radius: 0.078 },
  rightThigh: { offset: { x: 0, y: -0.4, z: 0 }, radius: 0.078 },
  leftLowerLeg: { offset: { x: 0, y: -0.42, z: 0 }, radius: 0.06 },
  rightLowerLeg: { offset: { x: 0, y: -0.42, z: 0 }, radius: 0.06 },
}

const ZERO: Vec3 = { x: 0, y: 0, z: 0 }

export function createZeroRotations(): BoneRotations {
  return Object.fromEntries(BONE_IDS.map((id) => [id, { ...ZERO }])) as BoneRotations
}

/**
 * PROTOTYPE: two head shapes under comparison; keep one and delete the other.
 * 'egg' is a single ellipsoid. 'jaw' is a round cranium with a small jaw, like
 * the ball-and-jaw construction of figure drawing. Both carry the same cross
 * guide (center line and eye line) on the front half of the head.
 */
const HEAD_VARIANT: 'egg' | 'jaw' = 'egg'

const HEADS = {
  egg: {
    parts: [
      { bone: 'head', shape: { kind: 'ellipsoid', radius: { x: 0.1, y: 0.12, z: 0.105 } }, position: { x: 0, y: 0.12, z: 0 } },
      { bone: 'head', shape: { kind: 'ellipsoid', radius: { x: 0.022, y: 0.03, z: 0.03 } }, position: { x: 0, y: 0.08, z: 0.095 } },
    ] as PartDef[],
    eyeLineY: 0.135,
    nose: { x: 0, y: 0.08, z: 0.125 },
    chin: { x: 0, y: 0.02, z: 0.06 },
  },
  jaw: {
    parts: [
      { bone: 'head', shape: { kind: 'ellipsoid', radius: { x: 0.098, y: 0.105, z: 0.1 } }, position: { x: 0, y: 0.14, z: -0.005 } },
      { bone: 'head', shape: { kind: 'ellipsoid', radius: { x: 0.068, y: 0.065, z: 0.07 } }, position: { x: 0, y: 0.065, z: 0.02 } },
      { bone: 'head', shape: { kind: 'ellipsoid', radius: { x: 0.022, y: 0.03, z: 0.03 } }, position: { x: 0, y: 0.085, z: 0.088 } },
    ] as PartDef[],
    eyeLineY: 0.14,
    nose: { x: 0, y: 0.085, z: 0.118 },
    chin: { x: 0, y: 0.01, z: 0.055 },
  },
}

const HEAD = HEADS[HEAD_VARIANT]

/**
 * Body shapes of the mannequin. Every part belongs to a bone and is positioned
 * relative to that bone pivot. Kept deliberately featureless (no eyes, hair or
 * clothing) so image AIs treat it purely as a pose reference; front and back
 * are told apart by the build: a nose, a ribcage leaning forward, shoulder
 * blades and a seat behind, plus the guide lines on the front (see below).
 */
const BODY_PARTS: PartDef[] = [
  // Pelvis, with the seat behind it
  { bone: 'hips', shape: { kind: 'ellipsoid', radius: { x: 0.15, y: 0.1, z: 0.1 } }, position: { x: 0, y: -0.02, z: 0 } },
  { bone: 'hips', shape: { kind: 'ellipsoid', radius: { x: 0.07, y: 0.075, z: 0.055 } }, position: { x: 0.055, y: -0.07, z: -0.045 } },
  { bone: 'hips', shape: { kind: 'ellipsoid', radius: { x: 0.07, y: 0.075, z: 0.055 } }, position: { x: -0.055, y: -0.07, z: -0.045 } },
  // Torso: abdomen, and a ribcage pushed forward over it with shoulder blades behind
  { bone: 'chest', shape: { kind: 'capsule', radius: 0.105, length: 0.14 }, position: { x: 0, y: 0.1, z: 0 } },
  { bone: 'chest', shape: { kind: 'ellipsoid', radius: { x: 0.15, y: 0.14, z: 0.11 } }, position: { x: 0, y: 0.29, z: 0.012 } },
  { bone: 'chest', shape: { kind: 'ellipsoid', radius: { x: 0.05, y: 0.065, z: 0.03 } }, position: { x: 0.065, y: 0.31, z: -0.07 } },
  { bone: 'chest', shape: { kind: 'ellipsoid', radius: { x: 0.05, y: 0.065, z: 0.03 } }, position: { x: -0.065, y: 0.31, z: -0.07 } },
  // Neck and head
  { bone: 'neck', shape: { kind: 'cylinder', radiusTop: 0.045, radiusBottom: 0.05, height: 0.1 }, position: { x: 0, y: 0.05, z: 0 } },
  ...HEAD.parts,
  // Shoulders (clavicles)
  { bone: 'leftShoulder', shape: { kind: 'capsule', radius: 0.045, length: 0.12 }, position: { x: 0.07, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 90 } },
  { bone: 'rightShoulder', shape: { kind: 'capsule', radius: 0.045, length: 0.12 }, position: { x: -0.07, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 90 } },
  // Arms
  { bone: 'leftUpperArm', shape: { kind: 'capsule', radius: 0.05, length: 0.28 }, position: { x: 0, y: -0.14, z: 0 } },
  { bone: 'rightUpperArm', shape: { kind: 'capsule', radius: 0.05, length: 0.28 }, position: { x: 0, y: -0.14, z: 0 } },
  { bone: 'leftForearm', shape: { kind: 'capsule', radius: 0.043, length: 0.26 }, position: { x: 0, y: -0.13, z: 0 } },
  { bone: 'rightForearm', shape: { kind: 'capsule', radius: 0.043, length: 0.26 }, position: { x: 0, y: -0.13, z: 0 } },
  { bone: 'leftHand', shape: { kind: 'ellipsoid', radius: { x: 0.042, y: 0.095, z: 0.022 } }, position: { x: 0, y: -0.085, z: 0 } },
  { bone: 'rightHand', shape: { kind: 'ellipsoid', radius: { x: 0.042, y: 0.095, z: 0.022 } }, position: { x: 0, y: -0.085, z: 0 } },
  // Legs
  { bone: 'leftThigh', shape: { kind: 'capsule', radius: 0.068, length: 0.4 }, position: { x: 0, y: -0.2, z: 0 } },
  { bone: 'rightThigh', shape: { kind: 'capsule', radius: 0.068, length: 0.4 }, position: { x: 0, y: -0.2, z: 0 } },
  { bone: 'leftLowerLeg', shape: { kind: 'capsule', radius: 0.052, length: 0.4 }, position: { x: 0, y: -0.2, z: 0 } },
  { bone: 'rightLowerLeg', shape: { kind: 'capsule', radius: 0.052, length: 0.4 }, position: { x: 0, y: -0.2, z: 0 } },
  // Feet (attached to the lower legs)
  { bone: 'leftLowerLeg', shape: { kind: 'ellipsoid', radius: { x: 0.05, y: 0.035, z: 0.12 } }, position: { x: 0, y: -0.445, z: 0.06 } },
  { bone: 'rightLowerLeg', shape: { kind: 'ellipsoid', radius: { x: 0.05, y: 0.035, z: 0.12 } }, position: { x: 0, y: -0.445, z: 0.06 } },
]

const CENTER_LINE_RADIUS = 0.0035
const CENTER_LINE_STEPS = 48

/** Front (+Z) of a bone's unrotated ellipsoids and capsules on its center plane (x = 0) at height y. */
function frontSurfaceZ(parts: PartDef[], y: number): number {
  let front = -Infinity
  for (const { shape, position, rotation } of parts) {
    if (rotation) continue
    let t = -1
    let depth = 0
    if (shape.kind === 'ellipsoid') {
      t = 1 - ((y - position.y) / shape.radius.y) ** 2 - (position.x / shape.radius.x) ** 2
      depth = shape.radius.z
    } else if (shape.kind === 'capsule') {
      const along = Math.max(Math.abs(y - position.y) - shape.length / 2, 0)
      t = 1 - (along ** 2 + position.x ** 2) / shape.radius ** 2
      depth = shape.radius
    }
    if (t >= 0) front = Math.max(front, position.z + depth * Math.sqrt(t))
  }
  return front
}

/**
 * Center-front guide line drawn on a bone's surface from `top` down to
 * `bottom`, like the construction line in figure drawing. It follows
 * BODY_PARTS, so reshaping the body keeps the line on the surface.
 */
function centerLine(bone: BoneId, top: number, bottom: number): PartDef {
  const parts = BODY_PARTS.filter((part) => part.bone === bone)
  const points = Array.from({ length: CENTER_LINE_STEPS + 1 }, (_, index) => {
    const y = top + ((bottom - top) * index) / CENTER_LINE_STEPS
    return { x: 0, y, z: frontSurfaceZ(parts, y) + 0.001 }
  })
  return { bone, shape: { kind: 'tube', radius: CENTER_LINE_RADIUS, points }, position: ZERO, accent: true }
}

/** Distance from (0, y, 0) along the horizontal direction at `angle` (0 = +Z) to the outside of a bone's unrotated ellipsoids. */
function horizontalReach(parts: PartDef[], y: number, angle: number): number {
  const dx = Math.sin(angle)
  const dz = Math.cos(angle)
  let reach = -Infinity
  for (const { shape, position, rotation } of parts) {
    if (rotation || shape.kind !== 'ellipsoid') continue
    const { radius } = shape
    const ox = -position.x
    const oz = -position.z
    const a = (dx / radius.x) ** 2 + (dz / radius.z) ** 2
    const b = 2 * ((dx * ox) / radius.x ** 2 + (dz * oz) / radius.z ** 2)
    const c = (ox / radius.x) ** 2 + ((y - position.y) / radius.y) ** 2 + (oz / radius.z) ** 2 - 1
    const discriminant = b * b - 4 * a * c
    if (discriminant >= 0) reach = Math.max(reach, (-b + Math.sqrt(discriminant)) / (2 * a))
  }
  return reach
}

/**
 * Eye line of the cross guide: wraps the front half of the head at height `y`,
 * from one ear to the other, so it shows where the face points and how it tilts
 * while the back of the head stays bare.
 */
function eyeLine(bone: BoneId, y: number): PartDef {
  const parts = BODY_PARTS.filter((part) => part.bone === bone)
  const points = Array.from({ length: CENTER_LINE_STEPS + 1 }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * index) / CENTER_LINE_STEPS
    const reach = horizontalReach(parts, y, angle) + 0.001
    return { x: reach * Math.sin(angle), y, z: reach * Math.cos(angle) }
  })
  return { bone, shape: { kind: 'tube', radius: CENTER_LINE_RADIUS, points }, position: ZERO, accent: true }
}

/** Everything that makes up the mannequin: the body plus the guide lines on the face and torso. */
export const MANNEQUIN_PARTS: PartDef[] = [
  ...BODY_PARTS,
  centerLine('head', 0.235, 0.005),
  eyeLine('head', HEAD.eyeLineY),
  centerLine('chest', 0.41, -0.03),
  centerLine('hips', 0, -0.1),
]

type Side = 'left' | 'right'
const sided = (side: Side, bone: string) => `${side}${bone}` as BoneId

function sidedLandmarks(name: string, bone: string, offset: Vec3, chain: string[]): JointLandmark[] {
  const title = name[0].toUpperCase() + name.slice(1)
  return (['left', 'right'] as const).map((side) => ({
    id: `${side}${title}`,
    bone: sided(side, bone),
    offset,
    ikChain: chain.map((name) => sided(side, name)),
  }))
}

/**
 * Points an AI agent can measure to check contact and grounding, or move with
 * the `reach` IK tool. Offsets are in the bone's local space and follow the
 * shapes in BODY_PARTS (head and nose, hand ellipsoid, foot on the lower
 * leg), so update both together. `ikChain` lists the bones IK rotates by
 * default to move the point, root side first; the pelvis and hips have none
 * because moving them means moving the whole body.
 */
export const JOINT_LANDMARKS: JointLandmark[] = [
  { id: 'pelvis', bone: 'hips', offset: { x: 0, y: 0, z: 0 }, ikChain: [] },
  { id: 'neckBase', bone: 'neck', offset: { x: 0, y: 0, z: 0 }, ikChain: ['chest'] },
  { id: 'headCenter', bone: 'head', offset: { x: 0, y: 0.12, z: 0 }, ikChain: ['neck', 'head'] },
  { id: 'headTop', bone: 'head', offset: { x: 0, y: 0.24, z: 0 }, ikChain: ['neck', 'head'] },
  { id: 'chin', bone: 'head', offset: HEAD.chin, ikChain: ['neck', 'head'] },
  { id: 'nose', bone: 'head', offset: HEAD.nose, ikChain: ['neck', 'head'] },
  ...sidedLandmarks('shoulder', 'UpperArm', { x: 0, y: 0, z: 0 }, ['Shoulder']),
  ...sidedLandmarks('elbow', 'Forearm', { x: 0, y: 0, z: 0 }, ['UpperArm']),
  ...sidedLandmarks('wrist', 'Hand', { x: 0, y: 0, z: 0 }, ['UpperArm', 'Forearm']),
  ...sidedLandmarks('palm', 'Hand', { x: 0, y: -0.085, z: 0 }, ['UpperArm', 'Forearm']),
  ...sidedLandmarks('fingertips', 'Hand', { x: 0, y: -0.18, z: 0 }, ['UpperArm', 'Forearm']),
  ...sidedLandmarks('hip', 'Thigh', { x: 0, y: 0, z: 0 }, []),
  ...sidedLandmarks('knee', 'LowerLeg', { x: 0, y: 0, z: 0 }, ['Thigh']),
  ...sidedLandmarks('ankle', 'LowerLeg', { x: 0, y: -0.4, z: 0 }, ['Thigh', 'LowerLeg']),
  ...sidedLandmarks('sole', 'LowerLeg', { x: 0, y: -0.48, z: 0.06 }, ['Thigh', 'LowerLeg']),
  ...sidedLandmarks('toe', 'LowerLeg', { x: 0, y: -0.445, z: 0.18 }, ['Thigh', 'LowerLeg']),
]

export const JOINT_LANDMARK_MAP: Record<string, JointLandmark> = Object.fromEntries(
  JOINT_LANDMARKS.map((landmark) => [landmark.id, landmark]),
)

/**
 * Elbows and knees bend on one axis only. IK changes just their local X angle,
 * within this range, so they never bend backwards or twist.
 */
export const HINGE_LIMITS: Partial<Record<BoneId, { min: number; max: number }>> = {
  leftForearm: { min: -160, max: 0 },
  rightForearm: { min: -160, max: 0 },
  leftLowerLeg: { min: 0, max: 160 },
  rightLowerLeg: { min: 0, max: 160 },
}

type AxisRange = { min: number; max: number }

/** Per-axis limits (Euler degrees) IK applies to the torso and head so it cannot fold them unnaturally. */
export const BALL_LIMITS: Partial<Record<BoneId, { x: AxisRange; y: AxisRange; z: AxisRange }>> = {
  chest: { x: { min: -40, max: 90 }, y: { min: -60, max: 60 }, z: { min: -45, max: 45 } },
  neck: { x: { min: -50, max: 60 }, y: { min: -70, max: 70 }, z: { min: -40, max: 40 } },
  head: { x: { min: -40, max: 40 }, y: { min: -50, max: 50 }, z: { min: -30, max: 30 } },
}

export const MANNEQUIN_COLORS: Array<{ id: string; label: string; value: string }> = [
  { id: 'light', label: '明るいグレー', value: '#c9c9c9' },
  { id: 'mid', label: 'グレー', value: '#8e8e8e' },
  { id: 'dark', label: 'ダークグレー', value: '#4f4f4f' },
  { id: 'white', label: '白', value: '#f0f0f0' },
]

export const DEFAULT_MANNEQUIN_COLOR = MANNEQUIN_COLORS[0].value
