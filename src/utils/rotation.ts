import { Euler, Quaternion } from 'three'
import type { Vec3 } from '../types/index.ts'
import { DEG2RAD, RAD2DEG, normalizeDegrees } from './math.ts'

const scratchEuler = new Euler(0, 0, 0, 'XYZ')
const scratchQuaternion = new Quaternion()

/**
 * Every XYZ Euler triple has a second triple describing the same orientation:
 * (x, y, z) and (x + 180, 180 - y, z + 180). Which one `setFromQuaternion`
 * returns depends on the quaternion, so a continuous drag can suddenly switch
 * representation and make the rotation sliders jump even though the pose is
 * unchanged. Picking the triple closest to the previous value hides that.
 */
function alternativeEuler(value: Vec3): Vec3 {
  return {
    x: normalizeDegrees(value.x + 180),
    y: normalizeDegrees(180 - value.y),
    z: normalizeDegrees(value.z + 180),
  }
}

function toQuaternion(value: Vec3, target: Quaternion): Quaternion {
  scratchEuler.set(value.x * DEG2RAD, value.y * DEG2RAD, value.z * DEG2RAD, 'XYZ')
  return target.setFromEuler(scratchEuler)
}

/** Sum of the shortest-arc distances per axis, used to compare two triples. */
function distanceTo(value: Vec3, reference: Vec3): number {
  return (
    Math.abs(normalizeDegrees(value.x - reference.x)) +
    Math.abs(normalizeDegrees(value.y - reference.y)) +
    Math.abs(normalizeDegrees(value.z - reference.z))
  )
}

function describesSameRotation(value: Vec3, quaternion: Quaternion): boolean {
  const rebuilt = toQuaternion(value, scratchQuaternion)
  // Quaternions q and -q are the same rotation, hence the absolute value.
  return Math.abs(rebuilt.dot(quaternion)) > 0.999
}

/**
 * Converts a quaternion to XYZ Euler angles in degrees, each within [-180, 180).
 * When `previous` is given, the equivalent triple closest to it is returned so
 * that values stay continuous across a drag.
 */
export function eulerDegreesFromQuaternion(quaternion: Quaternion, previous?: Vec3): Vec3 {
  scratchEuler.setFromQuaternion(quaternion, 'XYZ')
  const candidate: Vec3 = {
    x: normalizeDegrees(scratchEuler.x * RAD2DEG),
    y: normalizeDegrees(scratchEuler.y * RAD2DEG),
    z: normalizeDegrees(scratchEuler.z * RAD2DEG),
  }
  if (!previous) return candidate

  const alternative = alternativeEuler(candidate)
  if (distanceTo(alternative, previous) >= distanceTo(candidate, previous)) return candidate
  // Guard against the identity above ever failing: never return a triple that
  // would change the pose just to keep the numbers tidy.
  return describesSameRotation(alternative, quaternion) ? alternative : candidate
}
