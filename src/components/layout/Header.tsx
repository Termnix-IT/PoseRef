import { UI } from '../../constants/uiText'
import { useAppStore } from '../../store'
import type { InteractionMode } from '../../types'
import { Button } from '../ui/Button'
import { SegmentedControl } from '../ui/SegmentedControl'

const MODE_OPTIONS: Array<{ id: InteractionMode; label: string }> = [
  { id: 'camera', label: UI.mode.camera },
  { id: 'pose', label: UI.mode.pose },
]

export function Header() {
  const resetAll = useAppStore((state) => state.resetAll)
  const isExporting = useAppStore((state) => state.isExporting)
  const interactionMode = useAppStore((state) => state.interactionMode)
  const setInteractionMode = useAppStore((state) => state.setInteractionMode)
  const agentConnected = useAppStore((state) => state.agentStatus === 'connected')
  const canUndo = useAppStore((state) => state.undoStack.length > 0)
  const undo = useAppStore((state) => state.undo)

  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__logo" aria-hidden>
          <svg viewBox="0 0 32 32" fill="#0e1014">
            <circle cx="16" cy="8.5" r="3.4" />
            <rect x="13.6" y="12.5" width="4.8" height="9" rx="2.4" />
            <rect x="8" y="13" width="4" height="8" rx="2" transform="rotate(20 10 17)" />
            <rect x="20" y="13" width="4" height="8" rx="2" transform="rotate(-20 22 17)" />
            <rect x="11.5" y="20.5" width="4" height="8.5" rx="2" />
            <rect x="16.5" y="20.5" width="4" height="8.5" rx="2" />
          </svg>
        </div>
        <h1 className="header__title">PoseRef</h1>
      </div>
      <span className="header__tagline">{UI.app.tagline}</span>
      <div className="header__spacer" />
      <span className="header__status" aria-live="polite">
        {isExporting ? UI.app.rendering : null}
      </span>
      <span
        className={`header__agent${agentConnected ? ' is-connected' : ''}`}
        title={agentConnected ? UI.agent.connectedTitle : UI.agent.disconnectedTitle}
      >
        <span className="header__agent-dot" aria-hidden />
        {agentConnected ? UI.agent.connected : UI.agent.disconnected}
      </span>
      <SegmentedControl
        compact
        options={MODE_OPTIONS}
        value={interactionMode}
        onChange={setInteractionMode}
        ariaLabel={UI.mode.label}
      />
      <Button size="sm" onClick={undo} disabled={!canUndo} title={UI.app.undoTitle}>
        {UI.app.undo}
      </Button>
      <Button size="sm" onClick={resetAll} title={UI.app.resetAllTitle}>
        {UI.app.resetAll}
      </Button>
    </header>
  )
}
