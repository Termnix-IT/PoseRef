import { flushSync, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { PerspectiveCamera } from 'three'
import { useAppStore } from '../../store'
import { renderScenePng } from '../../utils/exportPng'
import { measureJoints } from '../../utils/jointPositions'
import { renderReviewSheet } from '../../utils/reviewRender'

/**
 * Exposes renderer-bound functions to the rest of the app through the store:
 * the PNG export, and the multi-view review sheet and joint positions used by AI agents.
 */
export function ExportBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const register = useAppStore((state) => state.registerExportRenderer)
  const registerReview = useAppStore((state) => state.registerReviewRenderer)
  const registerJoints = useAppStore((state) => state.registerJointReader)

  useEffect(() => {
    register(({ width, height }) =>
      renderScenePng({ gl, scene, camera: camera as PerspectiveCamera, width, height }),
    )
    return () => register(null)
  }, [gl, scene, camera, register])

  useEffect(() => {
    registerReview((views, size) => {
      // An agent usually renders right after changing the scene, often while this tab is in
      // the background; commit any pending scene updates before drawing.
      flushSync(() => {})
      const state = useAppStore.getState()
      return renderReviewSheet({
        gl,
        scene,
        views,
        size,
        camera: state.camera,
        aspectRatio: state.aspectRatio,
        characterYaw: state.character.yaw,
      })
    })
    return () => registerReview(null)
  }, [gl, scene, registerReview])

  useEffect(() => {
    registerJoints(() => {
      // Same as above: the scene graph must reflect the latest pose before it is measured.
      flushSync(() => {})
      return measureJoints(scene)
    })
    return () => registerJoints(null)
  }, [scene, registerJoints])

  return null
}
