import { useCallback, useRef, useState } from 'react'
import { ASPECT_RATIOS, ASPECT_RATIO_MAP, getAspectValue, getExportSize } from '../../constants/aspectRatios'
import { BACKGROUND_MAP } from '../../constants/backgrounds'
import { UI } from '../../constants/uiText'
import { useDismiss } from '../../hooks/useDismiss'
import { useFitAspect } from '../../hooks/useFitAspect'
import { useAppStore } from '../../store'
import { Icon } from '../ui/Icon'
import { SceneCanvas } from './SceneCanvas'
import { ViewCube } from './ViewCube'

const VIEWPORT_PADDING = 20
const TIMES = '×'

/**
 * Hosts the 3D canvas. The canvas is sized to the selected aspect ratio so that
 * what is shown on screen is exactly what gets exported.
 */
export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const aspectRatio = useAppStore((state) => state.aspectRatio)
  const background = useAppStore((state) => state.background)
  const size = useFitAspect(containerRef, getAspectValue(aspectRatio), VIEWPORT_PADDING)

  const transparent = BACKGROUND_MAP[background].color === null
  const frameClass = `viewport__frame${transparent ? ' viewport__frame--transparent' : ''}`

  return (
    <div className="viewport" ref={containerRef}>
      <div className={frameClass} style={{ width: size.width, height: size.height }}>
        {size.width > 0 && size.height > 0 ? <SceneCanvas /> : null}
        <ViewCube />
        <AspectRatioMenu />
      </div>
    </div>
  )
}

/** The output size shown on the frame doubles as the control that changes it. */
function AspectRatioMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const aspectRatio = useAppStore((state) => state.aspectRatio)
  const exportScale = useAppStore((state) => state.exportScale)
  const setAspectRatio = useAppStore((state) => state.setAspectRatio)
  const showNotice = useAppStore((state) => state.showNotice)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(rootRef, open, close)

  const current = getExportSize(aspectRatio, exportScale)

  return (
    <div className="menu viewport__aspect" ref={rootRef}>
      <button
        type="button"
        className="viewport__badge"
        aria-haspopup="true"
        aria-expanded={open}
        title={UI.viewport.aspect}
        onClick={() => setOpen((value) => !value)}
      >
        {ASPECT_RATIO_MAP[aspectRatio].label} {'·'} {current.width} {TIMES} {current.height}
        <Icon name="chevronDown" size={12} />
      </button>
      {open ? (
        <div className="menu__panel menu__panel--right menu__panel--list" role="menu" aria-label={UI.viewport.aspect}>
          {ASPECT_RATIOS.map((option) => {
            const size = getExportSize(option.id, exportScale)
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={option.id === aspectRatio}
                className={`menu__item${option.id === aspectRatio ? ' is-active' : ''}`}
                onClick={() => {
                  setAspectRatio(option.id)
                  setOpen(false)
                  if (option.id !== aspectRatio) showNotice(UI.export.aspectChanged(option.label))
                }}
              >
                <span>{option.label}</span>
                <span className="menu__item-meta">
                  {size.width} {TIMES} {size.height}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
