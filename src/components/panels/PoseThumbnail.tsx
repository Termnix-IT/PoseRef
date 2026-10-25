import { memo, useMemo } from 'react'
import type { PosePresetId } from '../../types'
import { createPoseFromPreset } from '../../store/slices/poseSlice'
import { poseFigure } from '../../utils/poseThumbnail'

/**
 * Stick-figure picture of a preset, drawn from forward kinematics. The
 * character's left limbs use the accent color so the side reads at a glance.
 */
export const PoseThumbnail = memo(function PoseThumbnail({ presetId }: { presetId: PosePresetId }) {
  const figure = useMemo(() => {
    const pose = createPoseFromPreset(presetId)
    return poseFigure(pose.bones, pose.rootOffset)
  }, [presetId])

  return (
    <svg className="pose-thumb" viewBox={`0 0 ${figure.width} ${figure.height}`} aria-hidden>
      {figure.segments.map((segment, index) => (
        <line
          key={index}
          className={`pose-thumb__limb pose-thumb__limb--${segment.side}`}
          x1={segment.from[0]}
          y1={segment.from[1]}
          x2={segment.to[0]}
          y2={segment.to[1]}
        />
      ))}
      <circle className="pose-thumb__head" cx={figure.head.center[0]} cy={figure.head.center[1]} r={figure.head.radius} />
    </svg>
  )
})
