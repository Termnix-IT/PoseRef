import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolvePort } from './server/port.ts'
import { poseRefBridge } from './server/vitePlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), poseRefBridge()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      // The app always opens its agent bridge on its own origin; in development that is Vite.
      '/ws': { target: `ws://127.0.0.1:${resolvePort()}`, ws: true },
    },
  },
})
