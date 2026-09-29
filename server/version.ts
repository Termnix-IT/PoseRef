import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The folder holding PoseRef's package.json, found by walking up from this
 * file. That works from server/*.ts (development), dist-server/cli.js (the
 * published build, including inside npx's cache) and Vite's bundled config in
 * node_modules/.vite-temp alike. Built with path functions rather than
 * `new URL(..., import.meta.url)`, which Vite would rewrite into an asset.
 */
function findPackageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url))
  for (let depth = 0; depth < 6; depth++) {
    const manifest = join(dir, 'package.json')
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name === 'poseref') return dir
    dir = dirname(dir)
  }
  throw new Error('Could not find the PoseRef package.json.')
}

export const PACKAGE_ROOT = findPackageRoot()

export const POSEREF_VERSION: string = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8')).version
