import { useCursor } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import { BONE_MAP, MANNEQUIN_PARTS, ROOT_BONE, childrenOf } from '../../constants/bones'
import { useAppStore } from '../../store'
import type { BoneId, PartDef, PartShape } from '../../types'
import { degToRad } from '../../utils/math'

const HIGHLIGHT_COLOR = '#4f8cff'
const UNIT_SCALE: [number, number, number] = [1, 1, 1]
const ZERO_ROTATION: [number, number, number] = [0, 0, 0]

/** Procedural, featureless mannequin driven by the pose store. */
export function Mannequin() {
  const position = useAppStore((state) => state.character.position)
  const yaw = useAppStore((state) => state.character.yaw)
  return (
    <group position={[position.x, position.y, position.z]} rotation={[0, degToRad(yaw), 0]}>
      <BoneNode id={ROOT_BONE} />
    </group>
  )
}

function BoneNode({ id }: { id: BoneId }) {
  const rotation = useAppStore((state) => state.pose.bones[id])
  const rootOffset = useAppStore((state) => (id === ROOT_BONE ? state.pose.rootOffset : null))
  const children = useMemo(() => childrenOf(id), [id])
  const parts = useMemo(() => MANNEQUIN_PARTS.filter((part) => part.bone === id), [id])
  const { offset } = BONE_MAP[id]
  const position: [number, number, number] = [
    offset.x + (rootOffset?.x ?? 0),
    offset.y + (rootOffset?.y ?? 0),
    offset.z + (rootOffset?.z ?? 0),
  ]

  return (
    <group position={position} rotation={[degToRad(rotation.x), degToRad(rotation.y), degToRad(rotation.z)]}>
      {parts.map((part, index) => (
        <MannequinPart key={`${id}-${index}`} part={part} />
      ))}
      {children.map((child) => (
        <BoneNode key={child.id} id={child.id} />
      ))}
    </group>
  )
}

function MannequinPart({ part }: { part: PartDef }) {
  const boneId = part.bone
  const selected = useAppStore((state) => state.selectedBone === boneId)
  const color = useAppStore((state) => state.character.color)
  const selectBone = useAppStore((state) => state.selectBone)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const scale: [number, number, number] =
    part.shape.kind === 'ellipsoid'
      ? [part.shape.radius.x, part.shape.radius.y, part.shape.radius.z]
      : UNIT_SCALE
  const rotation: [number, number, number] = part.rotation
    ? [degToRad(part.rotation.x), degToRad(part.rotation.y), degToRad(part.rotation.z)]
    : ZERO_ROTATION

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    selectBone(boneId)
  }
  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(true)
  }

  return (
    <mesh
      position={[part.position.x, part.position.y, part.position.z]}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
      userData={{ boneId }}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={() => setHovered(false)}
    >
      <PartGeometry shape={part.shape} />
      <meshStandardMaterial
        color={color}
        roughness={0.62}
        metalness={0.05}
        emissive={HIGHLIGHT_COLOR}
        emissiveIntensity={selected ? 0.5 : hovered ? 0.18 : 0}
      />
    </mesh>
  )
}

function PartGeometry({ shape }: { shape: PartShape }) {
  switch (shape.kind) {
    case 'capsule':
      return <capsuleGeometry args={[shape.radius, shape.length, 8, 24]} />
    case 'ellipsoid':
      return <sphereGeometry args={[1, 32, 24]} />
    case 'cylinder':
      return <cylinderGeometry args={[shape.radiusTop, shape.radiusBottom, shape.height, 24]} />
  }
}
