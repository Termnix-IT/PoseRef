import type { BoneDef, BoneId, BoneRotations, PartDef, Vec3 } from '../types'

/** Base height of the hips pivot above the floor (meters). */
export const HIPS_BASE_Y = 0.94

/**
 * Bone hierarchy. Pivots are expressed relative to the parent pivot.
 * The character faces +Z, +X is the left side of the character, +Y is up.
 * Limb meshes extend along local -Y from their pivot.
 */
export const BONES: BoneDef[] = [
  { id: 'hips', label: 'Hips', parent: null, offset: { x: 0, y: HIPS_BASE_Y, z: 0 } },
  { id: 'chest', label: 'Chest', parent: 'hips', offset: { x: 0, y: 0.07, z: 0 } },
  { id: 'neck', label: 'Neck', parent: 'chest', offset: { x: 0, y: 0.43, z: 0 } },
  { id: 'head', label: 'Head', parent: 'neck', offset: { x: 0, y: 0.08, z: 0 } },
  { id: 'leftShoulder', label: 'L Shoulder', parent: 'chest', offset: { x: 0.07, y: 0.38, z: 0 } },
  { id: 'rightShoulder', label: 'R Shoulder', parent: 'chest', offset: { x: -0.07, y: 0.38, z: 0 } },
  { id: 'leftUpperArm', label: 'L Upper Arm', parent: 'leftShoulder', offset: { x: 0.14, y: 0, z: 0 } },
  { id: 'rightUpperArm', label: 'R Upper Arm', parent: 'rightShoulder', offset: { x: -0.14, y: 0, z: 0 } },
  { id: 'leftForearm', label: 'L Forearm', parent: 'leftUpperArm', offset: { x: 0, y: -0.28, z: 0 } },
  { id: 'rightForearm', label: 'R Forearm', parent: 'rightUpperArm', offset: { x: 0, y: -0.28, z: 0 } },
  { id: 'leftHand', label: 'L Hand', parent: 'leftForearm', offset: { x: 0, y: -0.26, z: 0 } },
  { id: 'rightHand', label: 'R Hand', parent: 'rightForearm', offset: { x: 0, y: -0.26, z: 0 } },
  { id: 'leftThigh', label: 'L Thigh', parent: 'hips', offset: { x: 0.095, y: -0.06, z: 0 } },
  { id: 'rightThigh', label: 'R Thigh', parent: 'hips', offset: { x: -0.095, y: -0.06, z: 0 } },
  { id: 'leftLowerLeg', label: 'L Lower Leg', parent: 'leftThigh', offset: { x: 0, y: -0.4, z: 0 } },
  { id: 'rightLowerLeg', label: 'R Lower Leg', parent: 'rightThigh', offset: { x: 0, y: -0.4, z: 0 } },
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
  { label: 'Shoulder', left: 'leftShoulder', right: 'rightShoulder' },
  { label: 'Upper Arm', left: 'leftUpperArm', right: 'rightUpperArm' },
  { label: 'Forearm', left: 'leftForearm', right: 'rightForearm' },
  { label: 'Hand', left: 'leftHand', right: 'rightHand' },
  { label: 'Thigh', left: 'leftThigh', right: 'rightThigh' },
  { label: 'Lower Leg', left: 'leftLowerLeg', right: 'rightLowerLeg' },
]

const ZERO: Vec3 = { x: 0, y: 0, z: 0 }

export function createZeroRotations(): BoneRotations {
  return Object.fromEntries(BONE_IDS.map((id) => [id, { ...ZERO }])) as BoneRotations
}

/**
 * Visual parts that make up the mannequin. Every part belongs to a bone and is
 * positioned relative to that bone pivot. Kept deliberately featureless
 * (no face, hair or clothing) so image AIs treat it purely as a pose reference.
 */
export const MANNEQUIN_PARTS: PartDef[] = [
  // Pelvis
  { bone: 'hips', shape: { kind: 'ellipsoid', radius: { x: 0.15, y: 0.1, z: 0.1 } }, position: { x: 0, y: -0.02, z: 0 } },
  // Torso
  { bone: 'chest', shape: { kind: 'capsule', radius: 0.105, length: 0.14 }, position: { x: 0, y: 0.1, z: 0 } },
  { bone: 'chest', shape: { kind: 'ellipsoid', radius: { x: 0.15, y: 0.14, z: 0.105 } }, position: { x: 0, y: 0.29, z: 0 } },
  // Neck and head
  { bone: 'neck', shape: { kind: 'cylinder', radiusTop: 0.045, radiusBottom: 0.05, height: 0.1 }, position: { x: 0, y: 0.05, z: 0 } },
  { bone: 'head', shape: { kind: 'ellipsoid', radius: { x: 0.1, y: 0.12, z: 0.105 } }, position: { x: 0, y: 0.12, z: 0 } },
  // Subtle nose bump: the only facing cue on an otherwise featureless head.
  { bone: 'head', shape: { kind: 'ellipsoid', radius: { x: 0.022, y: 0.03, z: 0.03 } }, position: { x: 0, y: 0.1, z: 0.1 } },
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

export const MANNEQUIN_COLORS: Array<{ id: string; label: string; value: string }> = [
  { id: 'light', label: 'Light', value: '#c9c9c9' },
  { id: 'mid', label: 'Mid', value: '#8e8e8e' },
  { id: 'dark', label: 'Dark', value: '#4f4f4f' },
  { id: 'white', label: 'White', value: '#f0f0f0' },
]

export const DEFAULT_MANNEQUIN_COLOR = MANNEQUIN_COLORS[0].value
