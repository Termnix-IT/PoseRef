import { useRef } from 'react'
import { ASPECT_RATIO_MAP, getAspectValue } from '../../constants/aspectRatios'
import { BACKGROUND_MAP } from '../../constants/backgrounds'
import { UI } from '../../constants/uiText'
import { useFitAspect } from '../../hooks/useFitAspect'
import { useAppStore } from '../../store'
import type { InteractionMode } from '../../types'
import { SegmentedControl } from '../ui/SegmentedControl'
import { SceneCanvas } from './SceneCanvas'

const VIEWPORT_PADDING = 20

const MODE_OPTIONS: Array<{ id: InteractionMode; label: string }> = [
  { id: 'camera', label: UI.mode.camera },
  { id: 'pose', label: UI.mode.pose },
]

/**
 * Hosts the 3D canvas. The canvas is sized to the selected aspect ratio so that
 * what is shown on screen is exactly what gets exported. The drag mode switch
 * sits on the view it affects; its tooltip carries the mouse controls.
 */
export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const aspectRatio = useAppStore((state) => state.aspectRatio)
  const background = useAppStore((state) => state.background)
  const exportScale = useAppStore((state) => state.exportScale)
  const interactionMode = useAppStore((state) => state.interactionMode)
  const setInteractionMode = useAppStore((state) => state.setInteractionMode)
  const size = useFitAspect(containerRef, getAspectValue(aspectRatio), VIEWPORT_PADDING)

  const option = ASPECT_RATIO_MAP[aspectRatio]
  const transparent = BACKGROUND_MAP[background].color === null
  const frameClass = `viewport__frame${transparent ? ' viewport__frame--transparent' : ''}`

  return (
    <div className="viewport" ref={containerRef}>
      <div className={frameClass} style={{ width: size.width, height: size.height }}>
        {size.width > 0 && size.height > 0 ? <SceneCanvas /> : null}
        <div className="viewport__mode" title={interactionMode === 'pose' ? UI.mode.poseTitle : UI.mode.cameraTitle}>
          <SegmentedControl
            compact
            options={MODE_OPTIONS}
            value={interactionMode}
            onChange={setInteractionMode}
            ariaLabel={UI.mode.label}
          />
        </div>
        <div className="viewport__badge" title={UI.viewport.output}>
          {option.width * exportScale} {'×'} {option.height * exportScale}
        </div>
      </div>
    </div>
  )
}
