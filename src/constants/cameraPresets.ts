import type { CameraPreset, CameraPresetId, Vec3 } from '../types'

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

/** Camera presets. The character stands at the origin facing +Z. */
export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'front', label: 'Front', position: v(0, 1.0, 3.4), target: v(0, 0.95, 0) },
  { id: 'back', label: 'Back', position: v(0, 1.0, -3.4), target: v(0, 0.95, 0) },
  { id: 'left', label: 'Left', position: v(3.4, 1.0, 0), target: v(0, 0.95, 0) },
  { id: 'right', label: 'Right', position: v(-3.4, 1.0, 0), target: v(0, 0.95, 0) },
  { id: 'highAngle', label: 'High Angle', position: v(1.6, 3.6, 2.6), target: v(0, 0.85, 0) },
  { id: 'lowAngle', label: 'Low Angle', position: v(1.3, 0.25, 3.0), target: v(0, 1.0, 0) },
  { id: 'threeQuarter', label: 'Three Quarter', position: v(1.95, 1.15, 2.78), target: v(0, 0.95, 0) },
]

export const CAMERA_PRESET_MAP: Record<CameraPresetId, CameraPreset> = Object.fromEntries(
  CAMERA_PRESETS.map((preset) => [preset.id, preset]),
) as Record<CameraPresetId, CameraPreset>

export const DEFAULT_CAMERA_PRESET: CameraPresetId = 'threeQuarter'
export const DEFAULT_FOV = 45
export const FOV_RANGE = { min: 15, max: 120 }
export const CAMERA_DISTANCE_RANGE = { min: 0.5, max: 12 }
export const CAMERA_POSITION_RANGE = { min: -10, max: 10 }
export const CAMERA_TARGET_RANGE = { min: -4, max: 4 }
