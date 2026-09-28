import { useAppStore } from '../store'
import { sceneDocumentFromState } from '../store/slices/agentSlice'
import {
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

/**
 * Keeps a WebSocket open to the PoseRef server so AI agents connected over MCP
 * can read, change and render the scene in this tab. Reconnects forever: the
 * server may be started after the page, or restarted while it stays open.
 */
export function startAgentBridge(): void {
  const { setAgentStatus } = useAppStore.getState()
  let retryDelay = RETRY_MIN_MS

  const connect = () => {
    setAgentStatus('connecting')
    const socket = new WebSocket(bridgeUrl())
    const send = (message: BrowserToServerMessage) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
    }
    const announceFocus = () => {
      if (document.visibilityState === 'visible') send({ type: 'focus' })
    }

    socket.addEventListener('open', () => {
      retryDelay = RETRY_MIN_MS
      setAgentStatus('connected')
      if (document.hasFocus()) announceFocus()
      window.addEventListener('focus', announceFocus)
    })

    socket.addEventListener('message', async (event) => {
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

    socket.addEventListener('close', () => {
      window.removeEventListener('focus', announceFocus)
      setAgentStatus('disconnected')
      window.setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS)
    })
  }

  connect()
}
