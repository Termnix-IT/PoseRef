import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from '@modelcontextprotocol/node'
import { WebSocketServer } from 'ws'
import { BRIDGE_PATH } from '../src/agent/protocol.ts'
import { BrowserBridge } from './bridge.ts'
import { createPoseRefMcpHandler } from './mcp.ts'

export const MCP_PATH = '/mcp'
/** Loopback only: the server drives the user's browser tab and must not be reachable from the network. */
const HOST = '127.0.0.1'

export interface PoseRefServerOptions {
  port: number
  /** Built app to serve (the `dist` folder). Omitted in development, where Vite serves the app. */
  staticDir?: string
  /** Page origins besides this server's own that may open the browser bridge (the Vite dev server). */
  extraOrigins?: string[]
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

async function serveStatic(root: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
  let file = normalize(join(root, pathname))
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end()
    return
  }
  const info = await stat(file).catch(() => null)
  if (!info || info.isDirectory()) file = join(root, 'index.html')
  const type = CONTENT_TYPES[extname(file)] ?? 'application/octet-stream'
  const isHtml = type.startsWith('text/html')
  res.writeHead(200, {
    'Content-Type': type,
    // Hashed assets never change; the page itself must pick up new builds.
    'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  createReadStream(file).pipe(res)
}

/**
 * One local process that serves the PoseRef app, the MCP endpoint for AI agents
 * (`/mcp`, Streamable HTTP) and the WebSocket the app connects back on (`/ws`).
 * Agents register only the URL, so the repository can live anywhere.
 */
export function createPoseRefServer(options: PoseRefServerOptions) {
  const appUrl = `http://${HOST}:${options.port}`
  const allowedOrigins = new Set([appUrl, `http://localhost:${options.port}`, ...(options.extraOrigins ?? [])])
  const bridge = new BrowserBridge(appUrl)
  const mcp = toNodeHandler(createPoseRefMcpHandler(bridge))
  const staticRoot = options.staticDir ? resolve(options.staticDir) : null
  // Rejects requests whose Host is not loopback (DNS rebinding) and cross-site pages calling /mcp.
  const validateHost = localhostHostValidation()
  const validateOrigin = localhostOriginValidation()

  const server = createServer((req, res) => {
    if (!validateHost(req, res)) return
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
    if (pathname === MCP_PATH) {
      if (!validateOrigin(req, res)) return
      void mcp(req, res)
      return
    }
    if (staticRoot) {
      serveStatic(staticRoot, req, res).catch(() => {
        if (!res.headersSent) res.writeHead(500)
        res.end()
      })
      return
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('PoseRef MCP server. The app is served by Vite.')
  })

  const sockets = new WebSocketServer({ noServer: true })
  server.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
    // Only the PoseRef page itself may drive the bridge, so the origin must match exactly.
    if (pathname !== BRIDGE_PATH || !allowedOrigins.has(req.headers.origin ?? '')) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n')
      return
    }
    sockets.handleUpgrade(req, socket, head, (ws) => bridge.attach(ws))
  })

  return {
    appUrl,
    mcpUrl: `${appUrl}${MCP_PATH}`,
    listen(): Promise<void> {
      return new Promise((resolveListen, rejectListen) => {
        server.once('error', rejectListen)
        server.listen(options.port, HOST, () => {
          server.off('error', rejectListen)
          resolveListen()
        })
      })
    },
    close(): Promise<void> {
      bridge.closeAll()
      sockets.close()
      return new Promise((resolveClose) => server.close(() => resolveClose()))
    },
  }
}
