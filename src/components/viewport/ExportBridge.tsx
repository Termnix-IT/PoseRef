import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { PerspectiveCamera } from 'three'
import { useAppStore } from '../../store'
import { renderScenePng } from '../../utils/exportPng'

/** Exposes a renderer-bound export function to the rest of the app through the store. */
export function ExportBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const register = useAppStore((state) => state.registerExportRenderer)

  useEffect(() => {
    register(({ width, height }) =>
      renderScenePng({ gl, scene, camera: camera as PerspectiveCamera, width, height }),
    )
    return () => register(null)
  }, [gl, scene, camera, register])

  return null
}
