import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Plane, Quaternion, Raycaster, Vector2, Vector3, type Object3D } from 'three'
import { useAppStore } from '../store'
import type { Axis, BoneId } from '../types'
import { roundVec3 } from '../utils/math'
import { eulerDegreesFromQuaternion } from '../utils/rotation'

/**
 * Shortest allowed distance between a bone pivot and the grabbed point.
 * Grabbing right next to the pivot would turn a few pixels of mouse travel
 * into a huge rotation, so short levers are extended to this length.
 */
const MIN_LEVER = 0.12

/** Below this |cos| between a ring's axis and the view direction the ring is seen edge-on. */
const EDGE_ON = 0.2
/** Rotation per pixel of horizontal movement when a ring is seen edge-on. */
const EDGE_ON_DEGREES_PER_PIXEL = 0.5

const AXIS_VECTORS: Record<Axis, Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
}

export interface PoseDragHandlers {
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void
  /** Starts turning the bone around one of its own axes (the rotation rings). */
  onRingPointerDown: (event: ThreeEvent<PointerEvent>, axis: Axis) => void
  onPointerOver: () => void
  onPointerOut: () => void
}

interface DragState {
  bone: BoneId
  pointerId: number
}

/** Where a bone is and how it is oriented when a drag starts. */
interface BoneFrame {
  bone: BoneId
  /** World position the bone rotates around. */
  pivot: Vector3
  startWorldQuaternion: Quaternion
  /** Inverse world rotation of the parent, to bring the result back into bone space. */
  parentWorldInverse: Quaternion
}

function boneFrame(group: Object3D): BoneFrame {
  group.updateWorldMatrix(true, false)
  return {
    bone: group.userData.boneGroup as BoneId,
    pivot: group.getWorldPosition(new Vector3()),
    startWorldQuaternion: group.getWorldQuaternion(new Quaternion()),
    parentWorldInverse: (group.parent ?? group).getWorldQuaternion(new Quaternion()).invert(),
  }
}

/** Applies a world-space rotation `delta` on top of the start orientation and stores it as the bone's Euler angles. */
function commitRotation(frame: BoneFrame, delta: Quaternion) {
  const nextLocal = frame.parentWorldInverse.clone().multiply(delta.clone().multiply(frame.startWorldQuaternion))
  const current = useAppStore.getState()
  const previous = current.pose.bones[frame.bone]
  current.setBoneRotationVec(frame.bone, roundVec3(eulerDegreesFromQuaternion(nextLocal, previous), 2))
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

  /** Turns the cursor position into a ray from the camera, or null when the canvas has no size. */
  const rayAt = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const rect = gl.domElement.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null
      const ndc = new Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      raycasterRef.current.setFromCamera(ndc, camera)
      return raycasterRef.current.ray
    },
    [camera, gl],
  )

  /** Holds the camera still and calls `onMove` for every move of this pointer until it is released. */
  const track = useCallback(
    (state: DragState, onMove: (event: PointerEvent) => void) => {
      dragRef.current = state
      applyCameraInteraction()
      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId === state.pointerId) onMove(moveEvent)
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
    [applyCameraInteraction],
  )

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const store = useAppStore.getState()
      if (store.interactionMode !== 'pose' || event.button !== 0) return
      // A rotation ring under the cursor wins even when the body is nearer, since the rings are drawn on top.
      if (event.intersections.some((hit) => hit.object.userData.rotationRing)) return
      const group = findBoneGroup(event.object)
      if (!group) return

      event.stopPropagation()
      const frame = boneFrame(group)
      store.selectBone(frame.bone)

      // The bone turns so that the centre of the grabbed mesh follows the
      // cursor, rather than the exact surface point under it. Limb parts and
      // joint handles are centred on the bone axis, so swinging them stays in
      // the plane of the screen instead of drifting out of it, while grips that
      // sit off the axis on purpose, such as the handle in front of the face,
      // still turn their bone the way their position suggests.
      event.object.updateWorldMatrix(true, false)
      const direction = event.object.getWorldPosition(new Vector3()).sub(frame.pivot)
      if (direction.lengthSq() < 1e-6) {
        // The grip sits on the pivot: swing the bone's own -Y axis instead.
        direction.set(0, -1, 0).applyQuaternion(frame.startWorldQuaternion)
      }
      direction.setLength(Math.max(direction.length(), MIN_LEVER))

      const viewAxis = camera.getWorldDirection(new Vector3()).negate()
      const plane = new Plane().setFromNormalAndCoplanarPoint(viewAxis, frame.pivot.clone().add(direction))
      const startDirection = direction.normalize()
      const hit = new Vector3()
      const targetDirection = new Vector3()

      track({ bone: frame.bone, pointerId: event.pointerId }, (moveEvent) => {
        const ray = rayAt(moveEvent)
        if (!ray || !ray.intersectPlane(plane, hit)) return
        targetDirection.copy(hit).sub(frame.pivot)
        if (targetDirection.lengthSq() < 1e-6) return
        commitRotation(frame, new Quaternion().setFromUnitVectors(startDirection, targetDirection.normalize()))
      })
    },
    [camera, rayAt, track],
  )

  const onRingPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>, axis: Axis) => {
      if (event.button !== 0) return
      const group = findBoneGroup(event.object)
      if (!group) return
      event.stopPropagation()
      const frame = boneFrame(group)
      const worldAxis = AXIS_VECTORS[axis].clone().applyQuaternion(frame.startWorldQuaternion).normalize()
      const plane = new Plane().setFromNormalAndCoplanarPoint(worldAxis, frame.pivot)
      const viewAxis = camera.getWorldDirection(new Vector3())
      const hit = new Vector3()

      // Seen face-on, the bone turns by the angle the cursor sweeps around the
      // pivot on the ring's plane. Seen edge-on that angle is unreliable, so
      // horizontal mouse travel drives the rotation instead.
      const startRay = rayAt(event.nativeEvent)
      const start = startRay?.intersectPlane(plane, hit) ? hit.clone().sub(frame.pivot) : null
      const edgeOn = Math.abs(worldAxis.dot(viewAxis)) < EDGE_ON || !start || start.lengthSq() < 1e-6
      const startX = event.nativeEvent.clientX
      const current = new Vector3()
      const cross = new Vector3()

      track({ bone: frame.bone, pointerId: event.pointerId }, (moveEvent) => {
        let angle: number
        if (edgeOn || !start) {
          angle = (moveEvent.clientX - startX) * EDGE_ON_DEGREES_PER_PIXEL * (Math.PI / 180)
        } else {
          const ray = rayAt(moveEvent)
          if (!ray || !ray.intersectPlane(plane, hit)) return
          current.copy(hit).sub(frame.pivot)
          if (current.lengthSq() < 1e-6) return
          angle = Math.atan2(cross.crossVectors(start, current).dot(worldAxis), start.dot(current))
        }
        commitRotation(frame, new Quaternion().setFromAxisAngle(worldAxis, angle))
      })
    },
    [camera, rayAt, track],
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
    () => ({ onPointerDown, onRingPointerDown, onPointerOver, onPointerOut }),
    [onPointerDown, onRingPointerDown, onPointerOver, onPointerOut],
  )
}
