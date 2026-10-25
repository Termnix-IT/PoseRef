import { BONES, BONE_IDS } from '../constants/bones.ts'
import type { BoneId, BoneRotations, Vec3 } from '../types/index.ts'

/** Avoids -0, which shows up as "-0" in number fields and breaks deep equality. */
const negate = (value: number) => (value === 0 ? 0 : -value)

/** The bone on the other side ('leftUpperArm' <-> 'rightUpperArm'); center bones map to themselves. */
export function oppositeBone(id: BoneId): BoneId {
  if (id.startsWith('left')) return `right${id.slice(4)}` as BoneId
  if (id.startsWith('right')) return `left${id.slice(5)}` as BoneId
  return id
}

/**
 * A rotation reflected across the character's center plane (x = 0). Bones on
 * both sides have mirrored rest positions, so the angle around X stays and the
 * angles around Y and Z change sign.
 */
export function mirrorRotation(rotation: Vec3): Vec3 {
  return { x: rotation.x, y: negate(rotation.y), z: negate(rotation.z) }
}

/** The whole pose flipped left and right, as if seen in a mirror. */
export function mirrorPose(bones: BoneRotations, rootOffset: Vec3): { bones: BoneRotations; rootOffset: Vec3 } {
  const mirrored = {} as BoneRotations
  for (const id of BONE_IDS) mirrored[oppositeBone(id)] = mirrorRotation(bones[id])
  return { bones: mirrored, rootOffset: { ...rootOffset, x: negate(rootOffset.x) } }
}

/** The bone and every bone below it, e.g. upper arm -> forearm -> hand. */
export function boneWithDescendants(id: BoneId): BoneId[] {
  const result: BoneId[] = [id]
  // BONES lists parents before children, so one pass collects the whole branch.
  for (const bone of BONES) {
    if (bone.parent && result.includes(bone.parent)) result.push(bone.id)
  }
  return result
}

/** Copies a side bone and the bones below it onto the other side, mirrored. Center bones are left as they are. */
export function copyToOppositeSide(bones: BoneRotations, id: BoneId): BoneRotations {
  if (oppositeBone(id) === id) return bones
  const next = { ...bones }
  for (const bone of boneWithDescendants(id)) next[oppositeBone(bone)] = mirrorRotation(bones[bone])
  return next
}
