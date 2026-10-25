import { UI } from '../../constants/uiText'
import { useAppStore } from '../../store'
import type { InteractionMode } from '../../types'
import { Icon } from '../ui/Icon'
import { ExportMenu } from './ExportMenu'

const MODES: Array<{ id: InteractionMode; label: string; title: string }> = [
  { id: 'camera', label: UI.mode.camera, title: UI.mode.cameraTitle },
  { id: 'pose', label: UI.mode.pose, title: UI.mode.poseTitle },
]

/**
 * Top bar of the tool: what a drag does and history on the left, connection
 * state, reset and the export action on the right.
 */
export function Toolbar() {
  const interactionMode = useAppStore((state) => state.interactionMode)
  const setInteractionMode = useAppStore((state) => state.setInteractionMode)
  const canUndo = useAppStore((state) => state.canUndo)
  const canRedo = useAppStore((state) => state.canRedo)
  const undo = useAppStore((state) => state.undo)
  const redo = useAppStore((state) => state.redo)
  const resetAll = useAppStore((state) => state.resetAll)
  const setPaletteOpen = useAppStore((state) => state.setPaletteOpen)
  const setUiHidden = useAppStore((state) => state.setUiHidden)
  const agentConnected = useAppStore((state) => state.agentStatus === 'connected')
  const agentTitle = agentConnected ? UI.agent.connectedTitle : UI.agent.disconnectedTitle

  return (
    <header className="toolbar" role="toolbar" aria-label={UI.app.toolbar}>
      <div className="segmented segmented--compact" role="group" aria-label={UI.mode.label}>
        {MODES.map((mode) => {
          const active = mode.id === interactionMode
          return (
            <button
              key={mode.id}
              type="button"
              className={`segmented__item${active ? ' is-active' : ''}`}
              aria-pressed={active}
              title={mode.title}
              onClick={() => setInteractionMode(mode.id)}
            >
              {mode.label}
            </button>
          )
        })}
      </div>
      <span className="toolbar__divider" aria-hidden />
      <button type="button" className="icon-btn" onClick={undo} disabled={!canUndo} title={UI.app.undo} aria-label={UI.app.undo}>
        <Icon name="undo" />
      </button>
      <button type="button" className="icon-btn" onClick={redo} disabled={!canRedo} title={UI.app.redo} aria-label={UI.app.redo}>
        <Icon name="redo" />
      </button>
      <div className="toolbar__spacer" />
      <button type="button" className="icon-btn" onClick={() => setPaletteOpen(true)} title={UI.app.commands} aria-label={UI.app.commands}>
        <Icon name="search" />
      </button>
      <button type="button" className="icon-btn" onClick={() => setUiHidden(true)} title={UI.app.hideUi} aria-label={UI.app.hideUi}>
        <Icon name="maximize" />
      </button>
      <span className={`toolbar__agent${agentConnected ? ' is-connected' : ''}`} title={agentTitle} aria-label={agentTitle}>
        <span className="toolbar__agent-dot" aria-hidden />
        {UI.agent.label}
      </span>
      <button type="button" className="icon-btn" onClick={resetAll} title={UI.app.resetAllTitle} aria-label={UI.app.resetAll}>
        <Icon name="reset" />
      </button>
      <ExportMenu />
    </header>
  )
}
