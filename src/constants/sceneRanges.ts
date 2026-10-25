import { CAMERA_POSITION_RANGE, CAMERA_TARGET_RANGE, FOV_RANGE } from './cameraPresets.ts'

/**
 * Accepted ranges for scene values. They match the UI sliders, so anything an
 * agent sets or a saved scene restores can also be edited by hand. Shared by
 * the server's scene schema and the browser's saved-scene check.
 */
export const SCENE_RANGES = {
  angle: { min: -360, max: 360 },
  rootOffset: { min: -1.5, max: 1.5 },
  characterX: { min: -3, max: 3 },
  characterY: { min: -1, max: 2 },
  characterZ: { min: -3, max: 3 },
  cameraPosition: CAMERA_POSITION_RANGE,
  cameraTarget: CAMERA_TARGET_RANGE,
  fov: FOV_RANGE,
}
