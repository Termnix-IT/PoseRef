import { Html } from '@react-three/drei'
import { useCallback, useRef } from 'react'
import { Vector3, type Camera, type Object3D } from 'three'
import { BONE_MAP, childrenOf } from '../../constants/bones'
import { UI } from '../../constants/uiText'
import { useAppStore } from '../../store'
import type { BoneId } from '../../types'
import { clamp } from '../../utils/math'
import { oppositeBone } from '../../utils/mirror'

/** Distance from the joint up to the bar's center, clear of the rotation rings (pixels). */
const ABOVE_JOINT = 46
/** Space kept between the bar and the edge of the view (pixels). */
const EDGE_MARGIN = 6
const scratch = new Vector3()

/**
 * Small bar of the actions that apply to the selected bone, drawn next to the
 * joint so they are where the eyes already are (like Photoshop's contextual
 * task bar). It is HTML anchored to the bone, so it never appears in the PNG.
 */
export function SelectionBar({ bone }: { bone: BoneId }) {
  const selectBone = useAppStore((state) => state.selectBone)
  const resetBone = useAppStore((state) => state.resetBone)
  const copyBoneToOppositeSide = useAppStore((state) => state.copyBoneToOppositeSide)
  const parent = BONE_MAP[bone].parent
  const child = childrenOf(bone)[0]?.id ?? null
  const label = BONE_MAP[bone].label
  const barRef = useRef<HTMLDivElement>(null)

  // Centered above the joint, where the limbs hanging from it are not, and kept fully inside the view.
  const calculatePosition = useCallback((anchor: Object3D, camera: Camera, size: { width: number; height: number }) => {
    scratch.setFromMatrixPosition(anchor.matrixWorld).project(camera)
    const halfWidth = (barRef.current?.offsetWidth ?? 0) / 2 + EDGE_MARGIN
    const halfHeight = (barRef.current?.offsetHeight ?? 0) / 2 + EDGE_MARGIN
    const x = ((scratch.x + 1) / 2) * size.width
    const y = ((1 - scratch.y) / 2) * size.height - ABOVE_JOINT
    return [clamp(x, halfWidth, size.width - halfWidth), clamp(y, halfHeight, size.height - halfHeight)]
  }, [])

  return (
    <Html zIndexRange={[30, 0]} wrapperClass="selection-bar__anchor" calculatePosition={calculatePosition}>
      <div ref={barRef} className="selection-bar" role="toolbar" aria-label={UI.selectionBar.label(label)}>
        <button type="button" disabled={!parent} title={UI.selectionBar.parent} onClick={() => parent && selectBone(parent)}>
          {UI.selectionBar.parentShort}
        </button>
        <button type="button" disabled={!child} title={UI.selectionBar.child} onClick={() => child && selectBone(child)}>
          {UI.selectionBar.childShort}
        </button>
        {oppositeBone(bone) !== bone ? (
          <button type="button" title={UI.pose.copyToOppositeTitle(label)} onClick={() => copyBoneToOppositeSide(bone)}>
            {UI.pose.copyToOpposite}
          </button>
        ) : null}
        <button type="button" title={UI.common.resetOf(UI.pose.rotationOf(label))} onClick={() => resetBone(bone)}>
          {UI.common.reset}
        </button>
        <button type="button" className="selection-bar__close" title={UI.selectionBar.deselect} aria-label={UI.selectionBar.deselect} onClick={() => selectBone(null)}>
          {'×'}
        </button>
      </div>
    </Html>
  )
}
