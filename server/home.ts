import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Per-user folder for the shared secret and review renders. It lives in the
 * home directory rather than the system temp folder, which other users can
 * read (and pre-create paths in) on Linux and macOS. POSEREF_HOME overrides it,
 * mainly for tests.
 */
export function poserefHome(): string {
  return process.env.POSEREF_HOME || join(homedir(), '.poseref')
}

/** Creates the folder if needed, readable only by the current user where the OS supports modes. */
export function ensurePrivateDir(path: string): string {
  mkdirSync(path, { recursive: true, mode: 0o700 })
  return path
}

export function secretPath(): string {
  return join(poserefHome(), 'secret')
}

export function rendersDir(): string {
  return ensurePrivateDir(join(ensurePrivateDir(poserefHome()), 'renders'))
}
