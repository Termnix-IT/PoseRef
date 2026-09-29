import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { openSync, readFileSync, writeSync, closeSync } from 'node:fs'
import { ensurePrivateDir, poserefHome, secretPath } from './home.ts'

/**
 * A per-user secret shared by the long-running PoseRef server and the stdio MCP
 * processes that agents start. It lets those processes (1) prove the listener
 * on the PoseRef port really is PoseRef before sending it anything, and (2)
 * call the server's internal bridge endpoint, which other local users and web
 * pages cannot. The file is created once, exclusively, with owner-only access.
 */
const SECRET_BYTES = 32

export function loadOrCreateSecret(path = secretPath()): Buffer {
  ensurePrivateDir(poserefHome())
  try {
    // 'wx' fails if the file exists, so two processes starting at once never overwrite each other.
    const fd = openSync(path, 'wx', 0o600)
    try {
      writeSync(fd, randomBytes(SECRET_BYTES).toString('hex'))
    } finally {
      closeSync(fd)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
  const secret = Buffer.from(readFileSync(path, 'utf8').trim(), 'hex')
  if (secret.length !== SECRET_BYTES) {
    throw new Error(`The PoseRef secret at ${path} is damaged. Delete it and start PoseRef again.`)
  }
  return secret
}

export function newNonce(): string {
  return randomBytes(16).toString('hex')
}

export function isValidNonce(nonce: string): boolean {
  return /^[0-9a-f]{32}$/.test(nonce)
}

/** The server's answer to a nonce: only a holder of the secret can compute it. */
export function identityProof(secret: Buffer, nonce: string): string {
  return createHmac('sha256', secret).update(`poseref-identify:${nonce}`).digest('hex')
}

/** Compares digests so neither length nor content leaks through timing. */
function sameDigest(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest()
  const right = createHash('sha256').update(b).digest()
  return timingSafeEqual(left, right)
}

export function verifyIdentityProof(secret: Buffer, nonce: string, proof: unknown): boolean {
  return typeof proof === 'string' && sameDigest(identityProof(secret, nonce), proof)
}

export function bearerToken(secret: Buffer): string {
  return secret.toString('hex')
}

export function bearerMatches(secret: Buffer, header: string | undefined): boolean {
  const match = /^Bearer ([0-9a-f]+)$/.exec(header ?? '')
  return match !== null && sameDigest(bearerToken(secret), match[1])
}
