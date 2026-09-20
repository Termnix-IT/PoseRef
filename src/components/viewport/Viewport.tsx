import { useRef } from 'react'
import { ASPECT_RATIO_MAP, getAspectValue } from '../../constants/aspectRatios'
import { BACKGROUND_MAP } from '../../constants/backgrounds'
import { UI } from '../../constants/uiText'
import { useFitAspect } from '../../hooks/useFitAspect'
import { useAppStore } from '../../store'
import { SceneCanvas } from './SceneCanvas'

const VIEWPORT_PADDING = 20

/**
 * Hosts the 3D canvas. The canvas is sized to the selected aspect ratio so that
 * what is shown on screen is exactly what gets exported.
 */
export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const aspectRatio = useAppStore((state) => state.aspectRatio)
  const background = useAppStore((state) => state.background)
  const exportScale = useAppStore((state) => state.exportScale)
  const poseMode = useAppStore((state) => state.interactionMode === 'pose')
  const size = useFitAspect(containerRef, getAspectValue(aspectRatio), VIEWPORT_PADDING)

  const option = ASPECT_RATIO_MAP[aspectRatio]
  const transparent = BACKGROUND_MAP[background].color === null
  const frameClass = `viewport__frame${transparent ? ' viewport__frame--transparent' : ''}`

  return (
    <div className="viewport" ref={containerRef}>
      <div className={frameClass} style={{ width: size.width, height: size.height }}>
        {size.width > 0 && size.height > 0 ? <SceneCanvas /> : null}
        <div className="viewport__badge">
          <span className="viewport__badge-label">{UI.viewport.output}</span>
          <span className="viewport__badge-value">
            {option.label} {'\u00B7'} {option.width * exportScale} {'\u00D7'} {option.height * exportScale} px
          </span>
        </div>
      </div>
      <p className="viewport__hint">{poseMode ? UI.viewport.hintPose : UI.viewport.hintCamera}</p>
    </div>
  )
}
