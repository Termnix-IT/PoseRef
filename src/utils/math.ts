import type { Axis, Vec3 } from '../types/index.ts'

export const DEG2RAD = Math.PI / 180
export const RAD2DEG = 180 / Math.PI

export function degToRad(degrees: number): number {
  return degrees * DEG2RAD
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function roundVec3(value: Vec3, decimals = 3): Vec3 {
  return { x: round(value.x, decimals), y: round(value.y, decimals), z: round(value.z, decimals) }
}

export function vec3Equals(a: Vec3, b: Vec3, epsilon = 1e-4): boolean {
  return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon && Math.abs(a.z - b.z) < epsilon
}

/** Orbit description of a camera around a target point. Angles in degrees. */
export interface Orbit {
  /** Horizontal angle. 0 = camera in front (+Z), positive = towards +X. */
  yaw: number
  /** Vertical angle. Positive = camera above the target. */
  pitch: number
  distance: number
}

export function orbitFromPositionTarget(position: Vec3, target: Vec3): Orbit {
  const dx = position.x - target.x
  const dy = position.y - target.y
  const dz = position.z - target.z
  const horizontal = Math.sqrt(dx * dx + dz * dz)
  return {
    yaw: Math.atan2(dx, dz) * RAD2DEG,
    pitch: Math.atan2(dy, horizontal) * RAD2DEG,
    distance: Math.sqrt(dx * dx + dy * dy + dz * dz),
  }
}

export function positionFromOrbit(orbit: Orbit, target: Vec3): Vec3 {
  const yaw = orbit.yaw * DEG2RAD
  const pitch = orbit.pitch * DEG2RAD
  const horizontal = orbit.distance * Math.cos(pitch)
  return {
    x: target.x + horizontal * Math.sin(yaw),
    y: target.y + orbit.distance * Math.sin(pitch),
    z: target.z + horizontal * Math.cos(yaw),
  }
}

/** Normalizes an angle in degrees to the range [-180, 180). */
export function normalizeDegrees(degrees: number): number {
  return ((((degrees + 180) % 360) + 360) % 360) - 180
}

export const AXES: Axis[] = ['x', 'y', 'z']
