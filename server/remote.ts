import { spawn } from 'node:child_process'
import type { BridgeMethod, BridgeMethods } from '../src/agent/protocol.ts'
import { bearerToken, newNonce, verifyIdentityProof } from './auth.ts'
import type { BridgeClient } from './bridge.ts'
import { openBrowser } from './browser.ts'
import type { IdentifyResponse } from './internal.ts'

const START_TIMEOUT_MS = 15_000
const TAB_WAIT_MS = 20_000
const POLL_MS = 300
const REQUEST_TIMEOUT_MS = 30_000

export interface RemoteBridgeOptions {
  port: number
  secret: Buffer
  /** Starts the PoseRef server as a detached background process. */
  startServer: () => void
  /** False (POSEREF_NO_OPEN) keeps the browser closed, e.g. for tests; the tools then report the missing tab. */
  openBrowser: boolean
  log: (message: string) => void
}

type Probe = { kind: 'poseref'; tabs: number } | { kind: 'absent' } | { kind: 'foreign' }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * The bridge used by `poseref mcp` (the stdio MCP server an agent starts). The
 * tools run in this process; only browser requests go to the long-running
 * PoseRef server. Nothing is started until a tool actually needs the browser,
 * because agents launch their MCP servers at the start of every session.
 *
 * Before any data is sent, the listener on the port must prove it holds the
 * per-user secret; a different program on that port is reported, never trusted.
 */
export class RemoteBridge implements BridgeClient {
  private readonly options: RemoteBridgeOptions
  private readonly baseUrl: string
  private ready: Promise<void> | null = null
  private browserOpened = false

  constructor(options: RemoteBridgeOptions) {
    this.options = options
    this.baseUrl = `http://127.0.0.1:${options.port}`
  }

  async request<M extends BridgeMethod>(method: M, params: BridgeMethods[M]['params']): Promise<BridgeMethods[M]['result']> {
    try {
      await this.ensureReady()
      return await this.call(method, params)
    } catch (error) {
      // The server may have been stopped since we checked; look again once.
      if (!(error instanceof TransportError)) throw error
      this.ready = null
      await this.ensureReady()
      return await this.call(method, params)
    }
  }

  private ensureReady(): Promise<void> {
    this.ready ??= this.prepare().catch((error) => {
      this.ready = null
      throw error
    })
    return this.ready
  }

  private async prepare(): Promise<void> {
    let probe = await this.probe()
    if (probe.kind === 'foreign') throw this.foreignError()
    if (probe.kind === 'absent') {
      this.options.log('Starting the PoseRef server…')
      this.options.startServer()
      probe = await this.waitFor((next) => next.kind !== 'absent', START_TIMEOUT_MS)
      if (probe.kind === 'foreign') throw this.foreignError()
      if (probe.kind === 'absent') throw new Error('The PoseRef server did not start. Run `npx poseref start` in a terminal to see why.')
    }
    if (this.options.openBrowser && probe.kind === 'poseref' && probe.tabs === 0 && !this.browserOpened) {
      this.browserOpened = true
      openBrowser(this.baseUrl, this.options.log)
      await this.waitFor((next) => next.kind === 'poseref' && next.tabs > 0, TAB_WAIT_MS)
    }
  }

  private async waitFor(done: (probe: Probe) => boolean, timeoutMs: number): Promise<Probe> {
    const deadline = Date.now() + timeoutMs
    let probe = await this.probe()
    while (!done(probe) && Date.now() < deadline) {
      await sleep(POLL_MS)
      probe = await this.probe()
    }
    return probe
  }

  /** Asks the listener to prove it is PoseRef. Any unexpected answer counts as a foreign program. */
  private async probe(): Promise<Probe> {
    const nonce = newNonce()
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/poseref/identify?nonce=${nonce}`, { signal: AbortSignal.timeout(3000) })
    } catch {
      return { kind: 'absent' }
    }
    try {
      const body = (await response.json()) as Partial<IdentifyResponse>
      if (response.ok && body.app === 'poseref' && verifyIdentityProof(this.options.secret, nonce, body.proof)) {
        return { kind: 'poseref', tabs: typeof body.tabs === 'number' ? body.tabs : 0 }
      }
    } catch {
      // Not JSON: not PoseRef.
    }
    return { kind: 'foreign' }
  }

  private foreignError(): Error {
    return new Error(
      `Port ${this.options.port} is used by another program, so PoseRef did not send it anything. ` +
        'Ask the user to close that program, or to set POSEREF_PORT to a free port for both the agent and PoseRef.',
    )
  }

  private async call<M extends BridgeMethod>(method: M, params: BridgeMethods[M]['params']): Promise<BridgeMethods[M]['result']> {
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/poseref/bridge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearerToken(this.options.secret)}` },
        body: JSON.stringify({ method, params }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      throw new TransportError(error instanceof Error ? error.message : String(error))
    }
    const body = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; error?: string }
    if (body.ok === true) return body.result as BridgeMethods[M]['result']
    if (body.ok === false && body.error) throw new Error(body.error)
    throw new Error(`The PoseRef server rejected the request (HTTP ${response.status}${body.error ? `: ${body.error}` : ''}).`)
  }
}

class TransportError extends Error {}

/**
 * Starts `poseref start --no-open` detached from the agent, so the server (and
 * the user's open tab) outlives the agent session that happened to start it.
 */
export function spawnDetachedServer(cliPath: string, log: (message: string) => void): void {
  const child = spawn(process.execPath, [cliPath, 'start', '--no-open'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: process.env,
  })
  child.on('error', (error) => log(`Could not start the PoseRef server: ${error.message}`))
  child.unref()
}
