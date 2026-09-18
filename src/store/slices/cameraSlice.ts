import type { StateCreator } from 'zustand'
import {
  CAMERA_DISTANCE_RANGE,
  CAMERA_PRESET_MAP,
  DEFAULT_CAMERA_PRESET,
  DEFAULT_FOV,
  FOV_RANGE,
} from '../../constants/cameraPresets'
import type { Axis, CameraPresetId, CameraState, Vec3 } from '../../types'
import { clamp, orbitFromPositionTarget, positionFromOrbit, roundVec3, vec3Equals, type Orbit } from '../../utils/math'
import type { AppStore } from '../index'

export interface CameraSlice {
  camera: CameraState
  /**
   * Incremented whenever the camera is changed from the UI (presets, sliders, reset).
   * The 3D view listens to it to push the stored transform into OrbitControls.
   * Changes coming from OrbitControls itself do not bump it, avoiding feedback loops.
   */
  cameraSyncId: number
  activeCameraPreset: CameraPresetId | 'custom'
  setFov: (fov: number) => void
  setCameraPosition: (axis: Axis, value: number) => void
  /** Moves the look-at point; the camera stays in place and re-aims. */
  setCameraTarget: (axis: Axis, value: number) => void
  /** Orbits the camera around the current look-at point. */
  setCameraOrbit: (orbit: Partial<Orbit>) => void
  applyCameraPreset: (id: CameraPresetId) => void
  /** Called by OrbitControls after user interaction. */
  syncCameraFromControls: (position: Vec3, target: Vec3) => void
  resetCamera: () => void
}

export function createDefaultCamera(): CameraState {
  const preset = CAMERA_PRESET_MAP[DEFAULT_CAMERA_PRESET]
  return { fov: DEFAULT_FOV, position: { ...preset.position }, target: { ...preset.target } }
}

export const createCameraSlice: StateCreator<AppStore, [], [], CameraSlice> = (set, get) => ({
  camera: createDefaultCamera(),
  cameraSyncId: 0,
  activeCameraPreset: DEFAULT_CAMERA_PRESET,
  setFov: (fov) =>
    set((state) => ({ camera: { ...state.camera, fov: clamp(fov, FOV_RANGE.min, FOV_RANGE.max) } })),
  setCameraPosition: (axis, value) =>
    set((state) => ({
      camera: { ...state.camera, position: { ...state.camera.position, [axis]: value } },
      cameraSyncId: state.cameraSyncId + 1,
      activeCameraPreset: 'custom',
    })),
  setCameraTarget: (axis, value) =>
    set((state) => ({
      camera: { ...state.camera, target: { ...state.camera.target, [axis]: value } },
      cameraSyncId: state.cameraSyncId + 1,
      activeCameraPreset: 'custom',
    })),
  setCameraOrbit: (partial) =>
    set((state) => {
      const current = orbitFromPositionTarget(state.camera.position, state.camera.target)
      const next: Orbit = { ...current, ...partial }
      next.pitch = clamp(next.pitch, -89, 89)
      next.distance = clamp(next.distance, CAMERA_DISTANCE_RANGE.min, CAMERA_DISTANCE_RANGE.max)
      return {
        camera: { ...state.camera, position: roundVec3(positionFromOrbit(next, state.camera.target), 4) },
        cameraSyncId: state.cameraSyncId + 1,
        activeCameraPreset: 'custom',
      }
    }),
  applyCameraPreset: (id) =>
    set((state) => {
      const preset = CAMERA_PRESET_MAP[id]
      return {
        camera: { ...state.camera, position: { ...preset.position }, target: { ...preset.target } },
        cameraSyncId: state.cameraSyncId + 1,
        activeCameraPreset: id,
      }
    }),
  syncCameraFromControls: (position, target) => {
    const { camera } = get()
    const nextPosition = roundVec3(position, 4)
    const nextTarget = roundVec3(target, 4)
    if (vec3Equals(nextPosition, camera.position) && vec3Equals(nextTarget, camera.target)) return
    set({
      camera: { ...camera, position: nextPosition, target: nextTarget },
      activeCameraPreset: 'custom',
    })
  },
  resetCamera: () =>
    set((state) => ({
      camera: createDefaultCamera(),
      cameraSyncId: state.cameraSyncId + 1,
      activeCameraPreset: DEFAULT_CAMERA_PRESET,
    })),
})
