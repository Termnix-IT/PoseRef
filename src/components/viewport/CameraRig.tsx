import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef, type ComponentRef } from 'react'
import type { PerspectiveCamera } from 'three'
import { CAMERA_DISTANCE_RANGE } from '../../constants/cameraPresets'
import { useAppStore } from '../../store'

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>

/**
 * Keeps the default camera and OrbitControls in sync with the store.
 * - UI changes (presets, sliders, reset) bump `cameraSyncId` and are pushed into the controls.
 * - User interaction with the controls is written back to the store without bumping it.
 */
export function CameraRig() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  // Registered by <OrbitControls makeDefault>; null until the controls are mounted.
  const controls = useThree((state) => state.controls) as unknown as OrbitControlsImpl | null
  const fov = useAppStore((state) => state.camera.fov)
  const syncId = useAppStore((state) => state.cameraSyncId)
  const syncFromControls = useAppStore((state) => state.syncCameraFromControls)
  // True while the store transform is being applied, so the resulting change events are ignored.
  const applying = useRef(false)

  useEffect(() => {
    if (!controls) return
    const { position, target } = useAppStore.getState().camera
    applying.current = true
    const damping = controls.enableDamping
    try {
      // Flush any residual damping motion first so it does not leak into the new transform.
      controls.enableDamping = false
      controls.update()
      camera.position.set(position.x, position.y, position.z)
      controls.target.set(target.x, target.y, target.z)
      controls.update()
    } finally {
      controls.enableDamping = damping
      applying.current = false
    }
  }, [syncId, camera, controls])

  useEffect(() => {
    camera.fov = fov
    camera.updateProjectionMatrix()
  }, [camera, fov])

  const handleChange = useCallback(() => {
    if (!controls || applying.current) return
    syncFromControls(
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      { x: controls.target.x, y: controls.target.y, z: controls.target.z },
    )
  }, [camera, controls, syncFromControls])

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={CAMERA_DISTANCE_RANGE.min}
      maxDistance={CAMERA_DISTANCE_RANGE.max}
      onChange={handleChange}
    />
  )
}
