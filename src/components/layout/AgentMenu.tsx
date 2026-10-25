import { useCallback, useRef, useState } from 'react'
import { agentPageUrl } from '../../agent/protocol'
import { canUseAgentBridge } from '../../agent/bridgeClient'
import { UI } from '../../constants/uiText'
import { useCopyText } from '../../hooks/useCopyText'
import { useDismiss } from '../../hooks/useDismiss'
import { useAppStore } from '../../store'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

/** Where `npx poseref start` serves the app unless POSEREF_PORT says otherwise (server/port.ts). */
const LOCAL_APP_URL = 'http://127.0.0.1:47173'
const SETUP_COMMAND = 'npx poseref setup'
const START_COMMAND = 'npx poseref start'

/**
 * The way into AI連携. The page never connects on its own: on this computer
 * the user turns it on here, and on a copy hosted on the web, where it cannot
 * work, the menu explains how to use the local version instead.
 */
export function AgentMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const status = useAppStore((state) => state.agentStatus)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(rootRef, open, close)
  const local = canUseAgentBridge()
  const A = UI.agent

  return (
    <div className="menu" ref={rootRef}>
      <button
        type="button"
        className={`toolbar__agent is-${status}`}
        aria-haspopup="true"
        aria-expanded={open}
        title={A.statusTitle[status]}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="toolbar__agent-dot" aria-hidden />
        {A.label}
        <Icon name="chevronDown" size={12} />
      </button>
      {open ? (
        <div className="menu__panel menu__panel--right agent-menu" role="dialog" aria-label={A.menuTitle}>
          <p className="agent-menu__title">{A.menuTitle}</p>
          {local ? <LocalAgentPanel /> : <HostedAgentPanel />}
        </div>
      ) : null}
    </div>
  )
}

/** On this computer: what AI連携 does, its state, and the switch. */
function LocalAgentPanel() {
  const status = useAppStore((state) => state.agentStatus)
  const setAgentEnabled = useAppStore((state) => state.setAgentEnabled)
  const A = UI.agent

  if (status === 'off') {
    return (
      <>
        <p className="agent-menu__text">{A.offText}</p>
        <Button variant="primary" block onClick={() => setAgentEnabled(true)}>
          {A.start}
        </Button>
        <p className="agent-menu__note">{A.setupNote}</p>
        <CommandLine command={SETUP_COMMAND} />
      </>
    )
  }
  return (
    <>
      <p className={`agent-menu__status is-${status}`}>
        <span className="toolbar__agent-dot" aria-hidden />
        {A.statusText[status]}
      </p>
      {status === 'disconnected' ? <CommandLine command={START_COMMAND} /> : null}
      <Button block onClick={() => setAgentEnabled(false)}>
        {A.stop}
      </Button>
    </>
  )
}

/** On a copy hosted on the web: AI連携 needs PoseRef running on the user's computer. */
function HostedAgentPanel() {
  const A = UI.agent
  return (
    <>
      <p className="agent-menu__text">{A.hostedText}</p>
      <ol className="agent-menu__steps">
        <li>
          {A.hostedStepSetup}
          <CommandLine command={SETUP_COMMAND} />
        </li>
        <li>{A.hostedStepOpen}</li>
      </ol>
      <a className="btn btn--secondary btn--md btn--block" href={agentPageUrl(LOCAL_APP_URL)} target="_blank" rel="noreferrer">
        {A.openLocal}
      </a>
      <p className="agent-menu__note">{A.hostedNote}</p>
    </>
  )
}

function CommandLine({ command }: { command: string }) {
  const { status, copy } = useCopyText()
  return (
    <div className="agent-menu__command">
      <code>{command}</code>
      <button type="button" onClick={() => void copy(command)} title={UI.agent.copyCommand}>
        {status === 'copied' ? UI.prompt.copied : UI.prompt.copy}
      </button>
    </div>
  )
}
