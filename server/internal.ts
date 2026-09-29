import type { IncomingMessage, ServerResponse } from 'node:http'
import type { BridgeMethod } from '../src/agent/protocol.ts'
import { bearerMatches, identityProof, isValidNonce } from './auth.ts'
import { NoBrowserError, type BrowserBridge } from './bridge.ts'
import { bridgeParamSchemas } from './sceneSchema.ts'

export const INTERNAL_PREFIX = '/poseref/'
/** Bridge requests are small JSON documents; anything bigger is not ours. */
const MAX_BODY_BYTES = 256 * 1024

export interface InternalOptions {
  secret: Buffer
  version: string
  bridge: BrowserBridge
  /** Called by POST /poseref/shutdown; absent when the host (e.g. Vite) owns the process. */
  onShutdown?: () => void
}

export interface IdentifyResponse {
  app: 'poseref'
  version: string
  tabs: number
  proof: string
}

function json(res: ServerResponse, status: number, body: unknown, close = false): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...(close ? { Connection: 'close' } : {}),
  })
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let tooLarge = false
    req.on('data', (chunk: Buffer) => {
      if (tooLarge) return
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        // Stop buffering; the rest is drained and dropped, and the 413 closes the connection.
        tooLarge = true
        chunks.length = 0
        reject(Object.assign(new Error('Request body too large'), { status: 413 }))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/**
 * Endpoints for PoseRef's own stdio MCP processes, never for web pages:
 * - GET  /poseref/identify?nonce=… proves this is PoseRef (HMAC of the nonce with the per-user secret)
 * - POST /poseref/bridge            forwards one request to the browser tab (bearer secret required)
 * - POST /poseref/shutdown          stops the server (bearer secret required)
 * Returns false when the path is not an internal one.
 */
export function createInternalHandler(options: InternalOptions) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith(INTERNAL_PREFIX)) return false

    // Browsers always send Origin on these requests; PoseRef's CLI never does.
    if (req.headers.origin !== undefined) {
      json(res, 403, { error: 'Forbidden' })
      return true
    }

    if (url.pathname === `${INTERNAL_PREFIX}identify` && req.method === 'GET') {
      const nonce = url.searchParams.get('nonce') ?? ''
      if (!isValidNonce(nonce)) {
        json(res, 400, { error: 'Invalid nonce' })
        return true
      }
      const body: IdentifyResponse = {
        app: 'poseref',
        version: options.version,
        tabs: options.bridge.connectedTabs,
        proof: identityProof(options.secret, nonce),
      }
      json(res, 200, body)
      return true
    }

    if (req.method !== 'POST' || !(url.pathname === `${INTERNAL_PREFIX}bridge` || url.pathname === `${INTERNAL_PREFIX}shutdown`)) {
      json(res, 404, { error: 'Not found' })
      return true
    }
    if (!bearerMatches(options.secret, req.headers.authorization)) {
      json(res, 401, { error: 'Unauthorized' })
      return true
    }

    if (url.pathname === `${INTERNAL_PREFIX}shutdown`) {
      if (!options.onShutdown) {
        json(res, 409, { error: 'This PoseRef server is managed by another process (e.g. npm run dev).' })
        return true
      }
      json(res, 200, { ok: true })
      options.onShutdown()
      return true
    }

    if (!(req.headers['content-type'] ?? '').startsWith('application/json')) {
      json(res, 415, { error: 'Expected application/json' })
      return true
    }
    void handleBridge(req, res, options.bridge)
    return true
  }
}

async function handleBridge(req: IncomingMessage, res: ServerResponse, bridge: BrowserBridge): Promise<void> {
  let payload: { method?: unknown; params?: unknown }
  try {
    payload = JSON.parse(await readBody(req))
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400
    json(res, status, { error: status === 413 ? 'Request body too large' : 'Invalid request body' }, status === 413)
    return
  }
  const method = payload.method
  if (typeof method !== 'string' || !Object.hasOwn(bridgeParamSchemas, method)) {
    json(res, 400, { error: 'Unknown method' })
    return
  }
  const parsed = bridgeParamSchemas[method as BridgeMethod].safeParse(payload.params ?? {})
  if (!parsed.success) {
    json(res, 400, { error: `Invalid params: ${parsed.error.message}` })
    return
  }
  try {
    // The schema matches the method, so the parsed params have the right shape for it.
    const result = await bridge.request(method as BridgeMethod, parsed.data as never)
    json(res, 200, { ok: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    json(res, error instanceof NoBrowserError ? 503 : 200, { ok: false, error: message })
  }
}
