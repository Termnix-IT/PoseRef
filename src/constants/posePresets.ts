import type { PosePreset, PosePresetId, Vec3 } from '../types'

const r = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

/**
 * Pose presets in degrees (Euler XYZ per bone).
 * Conventions: limbs hang along -Y at rest. For arms, negative X swings forward,
 * positive Z raises the left arm outward (negative Z for the right arm).
 * For legs, negative X lifts the thigh forward and positive X on the lower leg bends the knee.
 */
export const POSE_PRESETS: PosePreset[] = [
  {
    id: 'tPose',
    label: 'T-Pose',
    bones: {
      leftUpperArm: r(0, 0, 90),
      rightUpperArm: r(0, 0, -90),
    },
  },
  {
    id: 'standing',
    label: 'Standing',
    bones: {
      leftUpperArm: r(-3, 0, 7),
      rightUpperArm: r(-3, 0, -7),
      leftForearm: r(-10, 0, 0),
      rightForearm: r(-10, 0, 0),
      leftThigh: r(0, 0, 3),
      rightThigh: r(0, 0, -3),
    },
  },
  {
    id: 'armsCrossed',
    label: 'Arms Crossed',
    bones: {
      chest: r(3, 0, 0),
      leftUpperArm: r(-62, 0, -8),
      leftForearm: r(0, -12, -100),
      rightUpperArm: r(-48, 0, 8),
      rightForearm: r(0, 12, 100),
      leftThigh: r(0, 0, 3),
      rightThigh: r(0, 0, -3),
    },
  },
  {
    id: 'peaceSign',
    label: 'Peace Sign',
    bones: {
      head: r(0, 0, 8),
      rightUpperArm: r(-25, 0, -50),
      rightForearm: r(-140, 0, 0),
      leftUpperArm: r(-3, 0, 8),
      leftForearm: r(-12, 0, 0),
      leftThigh: r(0, 0, 4),
      rightThigh: r(0, 0, -4),
    },
  },
  {
    id: 'running',
    label: 'Running',
    bones: {
      chest: r(15, 0, 0),
      head: r(-10, 0, 0),
      leftThigh: r(-55, 0, 2),
      leftLowerLeg: r(85, 0, 0),
      rightThigh: r(30, 0, -2),
      rightLowerLeg: r(20, 0, 0),
      rightUpperArm: r(-55, 0, -8),
      rightForearm: r(-95, 0, 0),
      leftUpperArm: r(40, 0, 8),
      leftForearm: r(-85, 0, 0),
    },
    rootOffset: r(0, -0.22, 0),
  },
  {
    id: 'sitting',
    label: 'Sitting',
    bones: {
      chest: r(5, 0, 0),
      leftThigh: r(-90, 0, 6),
      rightThigh: r(-90, 0, -6),
      leftLowerLeg: r(90, 0, 0),
      rightLowerLeg: r(90, 0, 0),
      leftUpperArm: r(-22, 0, 6),
      rightUpperArm: r(-22, 0, -6),
      leftForearm: r(-40, 0, 0),
      rightForearm: r(-40, 0, 0),
    },
    rootOffset: r(0, -0.4, 0),
  },
  {
    id: 'lookingBack',
    label: 'Looking Back',
    bones: {
      hips: r(0, 8, 0),
      chest: r(0, 35, 0),
      neck: r(0, 25, 0),
      head: r(-8, 45, 0),
      leftUpperArm: r(8, 0, 6),
      rightUpperArm: r(-6, 0, -8),
      leftForearm: r(-15, 0, 0),
      rightForearm: r(-12, 0, 0),
      leftThigh: r(0, 0, 3),
      rightThigh: r(0, 0, -3),
    },
  },
  {
    id: 'fightingPose',
    label: 'Fighting Pose',
    bones: {
      hips: r(0, 30, 0),
      chest: r(8, -12, 0),
      head: r(5, -18, 0),
      rightThigh: r(-20, 0, -14),
      rightLowerLeg: r(30, 0, 0),
      leftThigh: r(12, 0, 14),
      leftLowerLeg: r(20, 0, 0),
      rightUpperArm: r(-70, 0, 10),
      rightForearm: r(-100, 0, 0),
      leftUpperArm: r(-60, 0, -25),
      leftForearm: r(-130, 0, 0),
    },
    rootOffset: r(0, -0.05, 0),
  },
]

export const POSE_PRESET_MAP: Record<PosePresetId, PosePreset> = Object.fromEntries(
  POSE_PRESETS.map((preset) => [preset.id, preset]),
) as Record<PosePresetId, PosePreset>

export const DEFAULT_POSE_PRESET: PosePresetId = 'standing'
