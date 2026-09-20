import { useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import { BONE_HANDLES } from '../../constants/bones'
import { useAppStore } from '../../store'
import type { BoneId } from '../../types'
import { usePoseDragContext } from './poseDragContext'

const COLOR = '#4f8cff'
const COLOR_ACTIVE = '#9fcaff'

/**
 * Grab handle sitting at the far end of a bone. Because it is rendered inside
 * that bone's group, dragging it rotates the bone it belongs to: the elbow
 * handle swings the upper arm, the wrist handle swings the forearm.
 * Marked with `poseHandle` so the PNG export can hide it.
 */
export function BoneHandle({ id }: { id: BoneId }) {
  const handle = BONE_HANDLES[id]
  const selected = useAppStore((state) => state.selectedBone === id)
  const drag = usePoseDragContext()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered, 'grab')

  if (!handle) return null
  const { offset, radius } = handle

  const active = hovered || selected
  const scale = hovered ? 1.25 : selected ? 1.12 : 1

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
    <mesh
      position={[offset.x, offset.y, offset.z]}
      scale={scale}
      userData={{ poseHandle: true }}
      onPointerDown={drag?.onPointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[radius, 20, 14]} />
      <meshBasicMaterial color={active ? COLOR_ACTIVE : COLOR} transparent opacity={active ? 0.95 : 0.7} />
    </mesh>
  )
}
