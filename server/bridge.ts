import type { WebSocket } from 'ws'
import type {
  BridgeMethod,
  BridgeMethods,
  BridgeRequest,
  BrowserToServerMessage,
} from '../src/agent/protocol.ts'

const REQUEST_TIMEOUT_MS = 20_000

interface Pending {
  socket: WebSocket
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

/**
 * What the MCP tools need from the browser: send a request to the open PoseRef
 * tab and get its answer. Implemented in-process by BrowserBridge and, for
 * stdio MCP processes, by RemoteBridge over the server's internal endpoint.
 */
export interface BridgeClient {
  request<M extends BridgeMethod>(method: M, params: BridgeMethods[M]['params']): Promise<BridgeMethods[M]['result']>
}

/** Thrown when no browser tab is connected; the message is meant for the agent to relay. */
export class NoBrowserError extends Error {}

/**
 * Tracks the PoseRef browser tabs connected over WebSocket and forwards agent
 * requests to one of them. The tab that most recently gained focus wins, so
 * with several tabs open the agent edits the one the user is looking at.
 */
export class BrowserBridge implements BridgeClient {
  private readonly tabs: WebSocket[] = []
  private readonly pending = new Map<number, Pending>()
  private nextId = 1
  private readonly appUrl: string

  // Node runs this file with type stripping only, so no constructor parameter properties.
  constructor(appUrl: string) {
    this.appUrl = appUrl
  }

  get connectedTabs(): number {
    return this.tabs.length
  }

  attach(socket: WebSocket): void {
    this.tabs.push(socket)
    socket.on('message', (data) => this.handleMessage(socket, String(data)))
    socket.on('close', () => this.detach(socket))
    socket.on('error', () => socket.close())
  }

  request<M extends BridgeMethod>(method: M, params: BridgeMethods[M]['params']): Promise<BridgeMethods[M]['result']> {
    const socket = this.tabs[this.tabs.length - 1]
    if (!socket) {
      return Promise.reject(
        new NoBrowserError(
          `No PoseRef browser tab is connected. Ask the user to open ${this.appUrl} in a browser, then retry. ` +
            'If that page does not load, PoseRef is not running: the user can start it with `npx poseref`.',
        ),
      )
    }
    const id = this.nextId++
    const message: BridgeRequest<M> = { type: 'request', id, method, params }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('The PoseRef browser tab did not answer in time. Ask the user to check that the tab is still open.'))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(id, { socket, resolve: resolve as (value: unknown) => void, reject, timer })
      socket.send(JSON.stringify(message))
    })
  }

  closeAll(): void {
    for (const socket of this.tabs) socket.terminate()
  }

  private handleMessage(socket: WebSocket, raw: string): void {
    let message: BrowserToServerMessage
    try {
      message = JSON.parse(raw) as BrowserToServerMessage
    } catch {
      return
    }
    if (message.type === 'focus') {
      // Move the tab to the end: the last entry is the active one.
      const index = this.tabs.indexOf(socket)
      if (index >= 0) this.tabs.push(...this.tabs.splice(index, 1))
      return
    }
    if (message.type !== 'response') return
    const entry = this.pending.get(message.id)
    if (!entry || entry.socket !== socket) return
    this.pending.delete(message.id)
    clearTimeout(entry.timer)
    if (message.ok) entry.resolve(message.result)
    else entry.reject(new Error(message.error))
  }

  private detach(socket: WebSocket): void {
    const index = this.tabs.indexOf(socket)
    if (index >= 0) this.tabs.splice(index, 1)
    for (const [id, entry] of this.pending) {
      if (entry.socket !== socket) continue
      this.pending.delete(id)
      clearTimeout(entry.timer)
      entry.reject(new Error('The PoseRef browser tab was closed before it answered.'))
    }
  }
}
