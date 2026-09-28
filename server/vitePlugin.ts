import type { Plugin } from 'vite'
import { resolvePort } from './port.ts'

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
      server
        .listen()
        .then(() => vite.config.logger.info(`  PoseRef MCP: ${server.mcpUrl}`))
        .catch((error: NodeJS.ErrnoException) => {
          const reason = error.code === 'EADDRINUSE' ? 'the port is in use (is `npm start` running?)' : error.message
          vite.config.logger.warn(`  PoseRef MCP is not available: ${reason}`)
        })
      vite.httpServer?.once('close', () => void server.close())
    },
  }
}
