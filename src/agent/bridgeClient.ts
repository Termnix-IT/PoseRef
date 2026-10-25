import { useAppStore } from '../store'
import { sceneDocumentFromState } from '../store/slices/agentSlice'
import {
  AGENT_CONNECT_PARAM,
  BRIDGE_PATH,
  type BridgeMethod,
  type BridgeMethods,
  type BridgeRequest,
  type BrowserToServerMessage,
} from './protocol'

const RETRY_MIN_MS = 1000
const RETRY_MAX_MS = 5000

type Handlers = {
  [M in BridgeMethod]: (params: BridgeMethods[M]['params']) => Promise<BridgeMethods[M]['result']>
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

async function pngSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

const handlers: Handlers = {
  getScene: async () => sceneDocumentFromState(useAppStore.getState()),
  setScene: async (doc) => {
    const groundShift = useAppStore.getState().applySceneDocument(doc)
    return { scene: sceneDocumentFromState(useAppStore.getState()), groundShift }
  },
  renderViews: async ({ views, size }) => {
    const renderer = useAppStore.getState().reviewRenderer
    if (!renderer) throw new Error('The 3D view is not ready yet.')
    const blob = await renderer(views, size)
    const { width, height } = await pngSize(blob)
    return { pngBase64: await blobToBase64(blob), width, height }
  },
  getJoints: async () => {
    const reader = useAppStore.getState().jointReader
    if (!reader) throw new Error('The 3D view is not ready yet.')
    return reader()
  },
}

function bridgeUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${BRIDGE_PATH}`
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]'])

/**
 * The PoseRef server listens on this computer only and accepts the bridge
 * only from the page it serves itself, so a copy of the app hosted on the web
 * can never connect. Such pages do not try at all.
 */
export function canUseAgentBridge(): boolean {
  return LOOPBACK_HOSTS.has(window.location.hostname)
}

/**
 * Turns AI連携 on when the page was opened for an agent (`?agent=1`, see
 * agentPageUrl), then removes the parameter so a reload or a bookmark does not
 * carry it along.
 */
function consumeConnectParam(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(AGENT_CONNECT_PARAM)) return
  if (canUseAgentBridge()) useAppStore.getState().setAgentEnabled(true)
  url.searchParams.delete(AGENT_CONNECT_PARAM)
  window.history.replaceState(window.history.state, '', url)
}

/**
 * Keeps a WebSocket open to the PoseRef server while AI連携 is on, so AI agents
 * connected over MCP can read, change and render the scene in this tab. It
 * reconnects while on (the server may be started after the page, or restarted
 * while it stays open) and closes as soon as the user turns AI連携 off.
 */
export function startAgentBridge(): void {
  consumeConnectParam()
  if (!canUseAgentBridge()) return

  const { setAgentStatus } = useAppStore.getState()
  let socket: WebSocket | null = null
  let retryTimer: number | undefined
  let retryDelay = RETRY_MIN_MS

  const connect = () => {
    setAgentStatus('connecting')
    const current = new WebSocket(bridgeUrl())
    socket = current
    const send = (message: BrowserToServerMessage) => {
      if (current.readyState === WebSocket.OPEN) current.send(JSON.stringify(message))
    }
    const announceFocus = () => {
      if (document.visibilityState === 'visible') send({ type: 'focus' })
    }

    current.addEventListener('open', () => {
      retryDelay = RETRY_MIN_MS
      setAgentStatus('connected')
      if (document.hasFocus()) announceFocus()
      window.addEventListener('focus', announceFocus)
    })

    current.addEventListener('message', async (event) => {
      let request: BridgeRequest
      try {
        request = JSON.parse(String(event.data)) as BridgeRequest
      } catch {
        return
      }
      if (request.type !== 'request' || !(request.method in handlers)) return
      try {
        const handler = handlers[request.method] as (params: unknown) => Promise<unknown>
        const result = await handler(request.params)
        send({ type: 'response', id: request.id, ok: true, result })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        send({ type: 'response', id: request.id, ok: false, error: message })
      }
    })

    current.addEventListener('close', () => {
      window.removeEventListener('focus', announceFocus)
      // Closed on purpose (AI連携 turned off): stay off.
      if (socket !== current) return
      socket = null
      setAgentStatus('disconnected')
      retryTimer = window.setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS)
    })
  }

  const stop = () => {
    window.clearTimeout(retryTimer)
    const current = socket
    socket = null
    current?.close()
    retryDelay = RETRY_MIN_MS
    setAgentStatus('off')
  }

  const apply = (enabled: boolean) => (enabled ? connect() : stop())
  apply(useAppStore.getState().agentEnabled)
  useAppStore.subscribe((state, previous) => {
    if (state.agentEnabled !== previous.agentEnabled) apply(state.agentEnabled)
  })
}
