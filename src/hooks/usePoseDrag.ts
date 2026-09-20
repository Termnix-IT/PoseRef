import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Plane, Quaternion, Raycaster, Vector2, Vector3, type Object3D } from 'three'
import { useAppStore } from '../store'
import type { BoneId } from '../types'
import { roundVec3 } from '../utils/math'
import { eulerDegreesFromQuaternion } from '../utils/rotation'

/**
 * Shortest allowed distance between a bone pivot and the grabbed point.
 * Grabbing right next to the pivot would turn a few pixels of mouse travel
 * into a huge rotation, so short levers are extended to this length.
 */
const MIN_LEVER = 0.12

export interface PoseDragHandlers {
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void
  onPointerOver: () => void
  onPointerOut: () => void
}

interface DragState {
  bone: BoneId
  pointerId: number
  /** World position the bone rotates around. */
  pivot: Vector3
  /** Camera-facing plane the cursor ray is projected onto. */
  plane: Plane
  /** Unit vector from the pivot to the grabbed point when the drag started. */
  startDirection: Vector3
  startWorldQuaternion: Quaternion
  /** Inverse world rotation of the parent, to bring the result back into bone space. */
  parentWorldInverse: Quaternion
}

/** Minimal shape of OrbitControls that this hook touches. */
interface OrbitLike {
  enableRotate: boolean
  enablePan: boolean
  enableZoom: boolean
}

/** Walks up the scene graph to the group that represents a bone. */
function findBoneGroup(object: Object3D): Object3D | null {
  let current: Object3D | null = object
  while (current) {
    if (typeof current.userData.boneGroup === 'string') return current
    current = current.parent
  }
  return null
}

/**
 * Rotation dragging for the mannequin. A pointer press on a body part or a
 * joint handle rotates the bone it belongs to so that the grabbed point follows
 * the cursor across a plane facing the camera. Only active in pose mode; the
 * camera keeps working when the drag starts on empty space.
 */
export function usePoseDrag(): PoseDragHandlers {
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as unknown as OrbitLike | null
  const interactionMode = useAppStore((state) => state.interactionMode)
  const dragRef = useRef<DragState | null>(null)
  const raycasterRef = useRef(new Raycaster())
  /** How many mannequin meshes the pointer is currently over. */
  const hoverCountRef = useRef(0)

  /**
   * Decides what the camera may do right now. While a bone is being dragged the
   * camera must hold completely still, because the drag plane is measured once
   * at the start. While merely hovering the mannequin in pose mode, only
   * rotating and panning are held back, so that the press which starts a drag
   * cannot also start an orbit. Zooming stays available throughout.
   */
  const applyCameraInteraction = useCallback(() => {
    if (!controls) return
    if (dragRef.current) {
      controls.enableRotate = false
      controls.enablePan = false
      controls.enableZoom = false
      return
    }
    const overModel = useAppStore.getState().interactionMode === 'pose' && hoverCountRef.current > 0
    controls.enableRotate = !overModel
    controls.enablePan = !overModel
    controls.enableZoom = true
  }, [controls])

  // Leaving pose mode (or unmounting) must never strand the camera locked.
  useEffect(() => {
    if (interactionMode === 'camera') dragRef.current = null
    applyCameraInteraction()
  }, [interactionMode, applyCameraInteraction])

  useEffect(
    () => () => {
      if (!controls) return
      controls.enableRotate = true
      controls.enablePan = true
      controls.enableZoom = true
    },
    [controls],
  )

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const store = useAppStore.getState()
      if (store.interactionMode !== 'pose' || event.button !== 0) return
      const group = findBoneGroup(event.object)
      if (!group) return

      event.stopPropagation()
      const bone = group.userData.boneGroup as BoneId
      store.selectBone(bone)

      event.object.updateWorldMatrix(true, false)
      const pivot = group.getWorldPosition(new Vector3())
      const startWorldQuaternion = group.getWorldQuaternion(new Quaternion())
      const parentWorldInverse = (group.parent ?? group).getWorldQuaternion(new Quaternion()).invert()

      // The bone turns so that the centre of the grabbed mesh follows the
      // cursor, rather than the exact surface point under it. Limb parts and
      // joint handles are centred on the bone axis, so swinging them stays in
      // the plane of the screen instead of drifting out of it, while grips that
      // sit off the axis on purpose, such as the handle in front of the face,
      // still turn their bone the way their position suggests.
      const direction = event.object.getWorldPosition(new Vector3()).sub(pivot)
      if (direction.lengthSq() < 1e-6) {
        // The grip sits on the pivot: swing the bone's own -Y axis instead.
        direction.set(0, -1, 0).applyQuaternion(startWorldQuaternion)
      }
      direction.setLength(Math.max(direction.length(), MIN_LEVER))

      const viewAxis = camera.getWorldDirection(new Vector3()).negate()
      const plane = new Plane().setFromNormalAndCoplanarPoint(viewAxis, pivot.clone().add(direction))

      const state: DragState = {
        bone,
        pointerId: event.pointerId,
        pivot,
        plane,
        startDirection: direction.normalize(),
        startWorldQuaternion,
        parentWorldInverse,
      }
      dragRef.current = state
      applyCameraInteraction()

      const ndc = new Vector2()
      const hit = new Vector3()
      const targetDirection = new Vector3()
      const delta = new Quaternion()
      const nextWorld = new Quaternion()
      const nextLocal = new Quaternion()

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== state.pointerId) return
        const rect = gl.domElement.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return
        ndc.set(
          ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1,
          -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1,
        )
        raycasterRef.current.setFromCamera(ndc, camera)
        if (!raycasterRef.current.ray.intersectPlane(state.plane, hit)) return

        targetDirection.copy(hit).sub(state.pivot)
        if (targetDirection.lengthSq() < 1e-6) return
        targetDirection.normalize()

        delta.setFromUnitVectors(state.startDirection, targetDirection)
        nextWorld.copy(delta).multiply(state.startWorldQuaternion)
        nextLocal.copy(state.parentWorldInverse).multiply(nextWorld)

        const current = useAppStore.getState()
        const previous = current.pose.bones[state.bone]
        current.setBoneRotationVec(state.bone, roundVec3(eulerDegreesFromQuaternion(nextLocal, previous), 2))
      }

      const handleUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== state.pointerId) return
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
        window.removeEventListener('pointercancel', handleUp)
        if (dragRef.current === state) dragRef.current = null
        applyCameraInteraction()
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleUp)
    },
    [applyCameraInteraction, camera, gl],
  )

  const onPointerOver = useCallback(() => {
    hoverCountRef.current += 1
    applyCameraInteraction()
  }, [applyCameraInteraction])

  const onPointerOut = useCallback(() => {
    hoverCountRef.current = Math.max(0, hoverCountRef.current - 1)
    applyCameraInteraction()
  }, [applyCameraInteraction])

  return useMemo(
    () => ({ onPointerDown, onPointerOver, onPointerOut }),
    [onPointerDown, onPointerOver, onPointerOut],
  )
}
