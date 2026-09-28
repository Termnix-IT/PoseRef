import type { Plugin } from 'vite'
import { resolvePort } from './port.ts'

/**
 * When Vite restarts after a config or server file change, the new plugin
 * instance starts before the previous bridge has released the port. Retry for a
 * few seconds; a port that stays busy means something else (e.g. `npm start`) owns it.
 */
const LISTEN_RETRIES = 20
const LISTEN_RETRY_MS = 250

async function listenWithRetry(listen: () => Promise<void>, stopped: () => boolean): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await listen()
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE' || attempt >= LISTEN_RETRIES) throw error
      await new Promise((resolve) => setTimeout(resolve, LISTEN_RETRY_MS))
      // Vite restarted again meanwhile; a late success here would hold the port with nobody to close it.
      if (stopped()) return
    }
  }
}

/**
 * Runs the MCP endpoint and browser bridge next to the Vite dev server, so AI
 * agents registered for `npm start` also work while developing. The page
 * reaches the bridge through Vite's `/ws` proxy (see vite.config.ts).
 */
export function poseRefBridge(): Plugin {
  return {
    name: 'poseref-bridge',
    apply: 'serve',
    async configureServer(vite) {
      // Loaded lazily so the config bundle (and `vite build`) never pulls in the server or the app constants.
      const { createPoseRefServer } = await import('./app.ts')
      const devPort = vite.config.server.port ?? 5173
      const server = createPoseRefServer({
        port: resolvePort(),
        extraOrigins: [`http://localhost:${devPort}`, `http://127.0.0.1:${devPort}`],
      })
      let closed = false
      listenWithRetry(() => server.listen(), () => closed)
        .then(() => {
          if (!closed) vite.config.logger.info(`  PoseRef MCP: ${server.mcpUrl}`)
        })
        .catch((error: NodeJS.ErrnoException) => {
          const reason = error.code === 'EADDRINUSE' ? 'the port is in use (is `npm start` running?)' : error.message
          vite.config.logger.warn(`  PoseRef MCP is not available: ${reason}`)
        })
      vite.httpServer?.once('close', () => {
        closed = true
        void server.close()
      })
    },
  }
}
