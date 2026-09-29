#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { createPoseRefServer } from './app.ts'
import { bearerToken, loadOrCreateSecret, newNonce, verifyIdentityProof } from './auth.ts'
import { openBrowser } from './browser.ts'
import type { IdentifyResponse } from './internal.ts'
import { createPoseRefMcpServer } from './mcp.ts'
import { resolvePort } from './port.ts'
import { RemoteBridge, spawnDetachedServer } from './remote.ts'
import { runSetup } from './setup.ts'
import { PACKAGE_ROOT, POSEREF_VERSION } from './version.ts'

const CLI_PATH = fileURLToPath(import.meta.url)
const DIST_DIR = join(PACKAGE_ROOT, 'dist')

const HELP = `PoseRef ${POSEREF_VERSION}: pose and composition reference maker for image AIs

Usage:
  npx poseref setup [--yes] [--dry-run]   Register PoseRef with Claude Code and Codex
  npx poseref [start] [--no-open]         Start PoseRef and open it in the browser
  npx poseref stop                        Stop a running PoseRef
  npx poseref mcp                         MCP server over stdio (agents run this; not for direct use)

Environment:
  POSEREF_PORT     Port to use (default 47173)
  POSEREF_NO_OPEN  Set to any value to never open the browser automatically
`

/** stderr only: in `mcp` mode stdout carries the MCP protocol and must stay clean. */
const log = (message: string) => process.stderr.write(`${message}\n`)

async function isPoseRefRunning(port: number, secret: Buffer): Promise<boolean> {
  const nonce = newNonce()
  try {
    const response = await fetch(`http://127.0.0.1:${port}/poseref/identify?nonce=${nonce}`, { signal: AbortSignal.timeout(3000) })
    const body = (await response.json()) as Partial<IdentifyResponse>
    return body.app === 'poseref' && verifyIdentityProof(secret, nonce, body.proof)
  } catch {
    return false
  }
}

async function start(args: string[]): Promise<number> {
  const open = !args.includes('--no-open') && !process.env.POSEREF_NO_OPEN
  if (!existsSync(DIST_DIR)) {
    log('The app build (dist/) is missing. In a clone of the repository, run `npm run build` first.')
    return 1
  }
  const port = resolvePort()
  const secret = loadOrCreateSecret()
  const server = createPoseRefServer({
    port,
    staticDir: DIST_DIR,
    secret,
    version: POSEREF_VERSION,
    onShutdown: () => void server.close().then(() => process.exit(0)),
  })
  try {
    await server.listen()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error
    if (await isPoseRefRunning(port, secret)) {
      log(`PoseRef is already running: ${server.appUrl}`)
      if (open) openBrowser(server.appUrl, log)
      return 0
    }
    log(`Port ${port} is used by another program. Close it, or set POSEREF_PORT to a free port (and re-run \`npx poseref setup\`).`)
    return 1
  }
  log(`PoseRef:  ${server.appUrl}`)
  log(`MCP URL:  ${server.mcpUrl}`)
  log('Press Ctrl+C to stop.')
  if (open) openBrowser(server.appUrl, log)
  const shutdown = () => void server.close().then(() => process.exit(0))
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  return new Promise<number>(() => {})
}

async function mcp(): Promise<number> {
  // Anything a dependency prints must not corrupt the protocol on stdout.
  console.log = console.error
  console.info = console.error
  const bridge = new RemoteBridge({
    port: resolvePort(),
    secret: loadOrCreateSecret(),
    startServer: () => spawnDetachedServer(CLI_PATH, log),
    openBrowser: !process.env.POSEREF_NO_OPEN,
    log,
  })
  serveStdio(() => createPoseRefMcpServer(bridge))
  return new Promise<number>(() => {})
}

async function stop(): Promise<number> {
  const port = resolvePort()
  const secret = loadOrCreateSecret()
  if (!(await isPoseRefRunning(port, secret))) {
    log('PoseRef is not running.')
    return 0
  }
  const response = await fetch(`http://127.0.0.1:${port}/poseref/shutdown`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearerToken(secret)}` },
  })
  log(response.ok ? 'PoseRef stopped.' : `Could not stop PoseRef (HTTP ${response.status}).`)
  return response.ok ? 0 : 1
}

async function main(argv: string[]): Promise<number> {
  const [command = 'start', ...args] = argv
  switch (command) {
    case 'start':
      return start(args)
    case '--no-open':
      return start(argv)
    case 'mcp':
      return mcp()
    case 'setup':
      return runSetup({ version: POSEREF_VERSION, yes: args.includes('--yes'), dryRun: args.includes('--dry-run'), log })
    case 'stop':
      return stop()
    case '--version':
    case '-v':
      log(POSEREF_VERSION)
      return 0
    case 'help':
    case '--help':
    case '-h':
      log(HELP)
      return 0
    default:
      log(`Unknown command: ${command}\n\n${HELP}`)
      return 1
  }
}

// Set the exit code and let Node finish on its own: calling process.exit() while fetch is still closing
// its socket trips a libuv assertion on Windows. `start` and `mcp` never resolve, so they keep running.
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code
  },
  (error: unknown) => {
    log(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  },
)
