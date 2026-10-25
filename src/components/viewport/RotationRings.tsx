import { useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import type { Axis, BoneId } from '../../types'
import { usePoseDragContext } from './poseDragContext'

const RADIUS: Partial<Record<BoneId, number>> = { hips: 0.22, chest: 0.24, head: 0.18 }
const DEFAULT_RADIUS = 0.15
const LINE = 0.005
/** Thicker invisible ring that receives the pointer, so the thin visible line is easy to grab. */
const GRIP = 0.022

/** Standard axis colors; Y runs along the limb, so the green ring twists it. */
const RINGS: Array<{ axis: Axis; color: string; rotation: [number, number, number] }> = [
  { axis: 'x', color: '#ff6b6b', rotation: [0, Math.PI / 2, 0] },
  { axis: 'y', color: '#5fd38d', rotation: [Math.PI / 2, 0, 0] },
  { axis: 'z', color: '#5b9bff', rotation: [0, 0, 0] },
]

/**
 * Three rings around the selected bone's pivot, one per local axis. Dragging a
 * ring turns the bone around that axis only. They are drawn over the body and
 * marked `poseHandle` so the PNG export leaves them out.
 */
export function RotationRings({ bone }: { bone: BoneId }) {
  const radius = RADIUS[bone] ?? DEFAULT_RADIUS
  return (
    <group userData={{ poseHandle: true }}>
      {RINGS.map((ring) => (
        <Ring key={ring.axis} axis={ring.axis} color={ring.color} rotation={ring.rotation} radius={radius} />
      ))}
    </group>
  )
}

function Ring({ axis, color, rotation, radius }: { axis: Axis; color: string; rotation: [number, number, number]; radius: number }) {
  const drag = usePoseDragContext()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered, 'grab')

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(true)
    drag?.onPointerOver()
  }
  const handlePointerOut = () => {
    setHovered(false)
    drag?.onPointerOut()
  }

  return (
    <group rotation={rotation}>
      <mesh renderOrder={20}>
        <torusGeometry args={[radius, hovered ? LINE * 1.8 : LINE, 8, 64]} />
        <meshBasicMaterial color={color} depthTest={false} transparent opacity={hovered ? 1 : 0.85} />
      </mesh>
      <mesh
        userData={{ rotationRing: axis }}
        onPointerDown={(event) => drag?.onRingPointerDown(event, axis)}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <torusGeometry args={[radius, GRIP, 6, 48]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
