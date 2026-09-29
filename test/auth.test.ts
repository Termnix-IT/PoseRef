import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import {
  bearerMatches,
  bearerToken,
  identityProof,
  isValidNonce,
  loadOrCreateSecret,
  newNonce,
  verifyIdentityProof,
} from '../server/auth.ts'

process.env.POSEREF_HOME = mkdtempSync(join(tmpdir(), 'poseref-auth-'))

describe('per-user secret', () => {
  test('is created once and then reused', () => {
    const path = join(process.env.POSEREF_HOME!, 'secret')
    const first = loadOrCreateSecret(path)
    const second = loadOrCreateSecret(path)
    assert.equal(first.length, 32)
    assert.deepEqual(first, second)
    assert.match(readFileSync(path, 'utf8'), /^[0-9a-f]{64}$/)
  })

  test('is readable only by its owner', { skip: process.platform === 'win32' && 'POSIX modes do not apply on Windows' }, () => {
    const path = join(process.env.POSEREF_HOME!, 'secret-mode')
    loadOrCreateSecret(path)
    assert.equal(statSync(path).mode & 0o777, 0o600)
  })

  test('refuses a damaged secret file instead of using it', () => {
    const path = join(process.env.POSEREF_HOME!, 'secret-damaged')
    writeFileSync(path, 'abc')
    assert.throws(() => loadOrCreateSecret(path), /damaged/)
  })
})

describe('identity proof and bearer token', () => {
  const secret = Buffer.alloc(32, 7)
  const other = Buffer.alloc(32, 8)

  test('only the holder of the secret can answer a nonce', () => {
    const nonce = newNonce()
    assert.ok(isValidNonce(nonce))
    assert.ok(verifyIdentityProof(secret, nonce, identityProof(secret, nonce)))
    assert.ok(!verifyIdentityProof(secret, nonce, identityProof(other, nonce)))
    assert.ok(!verifyIdentityProof(secret, newNonce(), identityProof(secret, nonce)), 'a proof for another nonce is rejected')
    assert.ok(!verifyIdentityProof(secret, nonce, undefined))
    assert.ok(!verifyIdentityProof(secret, nonce, 'short'))
  })

  test('nonces must be 32 hex characters', () => {
    assert.ok(!isValidNonce(''))
    assert.ok(!isValidNonce('x'.repeat(32)))
    assert.ok(!isValidNonce('ab'.repeat(40)))
  })

  test('the bearer header must carry this secret exactly', () => {
    assert.ok(bearerMatches(secret, `Bearer ${bearerToken(secret)}`))
    assert.ok(!bearerMatches(secret, `Bearer ${bearerToken(other)}`))
    assert.ok(!bearerMatches(secret, bearerToken(secret)))
    assert.ok(!bearerMatches(secret, undefined))
    assert.ok(!bearerMatches(secret, 'Bearer '))
  })
})
