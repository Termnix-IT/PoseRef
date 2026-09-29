import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { createServer as createHttpServer, type Server } from 'node:http'
import { createServer as createNetServer, type AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { WebSocket } from 'ws'
import { bearerToken, newNonce, verifyIdentityProof } from '../server/auth.ts'
import { createPoseRefServer } from '../server/app.ts'
import { RemoteBridge } from '../server/remote.ts'

process.env.POSEREF_HOME = mkdtempSync(join(tmpdir(), 'poseref-server-'))

const secret = Buffer.alloc(32, 3)
const noop = () => {}

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const probe = createNetServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as AddressInfo
      probe.close(() => resolve(port))
    })
  })
}

async function post(port: number, path: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearerToken(secret)}`, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
  return { status: response.status, body: (await response.json()) as Record<string, unknown> }
}

/** Plays the PoseRef page: connects to /ws and answers bridge requests. */
function fakeTab(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin: `http://127.0.0.1:${port}` })
    ws.on('message', (data) => {
      const request = JSON.parse(String(data))
      ws.send(JSON.stringify({ type: 'response', id: request.id, ok: true, result: { version: 1, echo: request.method } }))
    })
    ws.on('open', () => resolve(ws))
    ws.on('error', reject)
  })
}

describe('internal endpoints', () => {
  let port: number
  let server: ReturnType<typeof createPoseRefServer>
  let shutdowns = 0

  before(async () => {
    port = await freePort()
    server = createPoseRefServer({ port, secret, version: '9.9.9', onShutdown: () => shutdowns++ })
    await server.listen()
  })
  after(() => server.close())

  test('identify proves the secret and reports the tab count', async () => {
    const nonce = newNonce()
    const body = (await (await fetch(`http://127.0.0.1:${port}/poseref/identify?nonce=${nonce}`)).json()) as Record<string, unknown>
    assert.equal(body.app, 'poseref')
    assert.equal(body.version, '9.9.9')
    assert.equal(body.tabs, 0)
    assert.ok(verifyIdentityProof(secret, nonce, body.proof))
  })

  test('identify rejects a malformed nonce', async () => {
    assert.equal((await fetch(`http://127.0.0.1:${port}/poseref/identify?nonce=zz`)).status, 400)
  })

  test('web pages are refused on every internal endpoint', async () => {
    const evil = { Origin: 'http://evil.example' }
    assert.equal((await fetch(`http://127.0.0.1:${port}/poseref/identify?nonce=${newNonce()}`, { headers: evil })).status, 403)
    assert.equal((await post(port, '/poseref/bridge', { method: 'getScene' }, evil)).status, 403)
    assert.equal((await post(port, '/poseref/shutdown', {}, evil)).status, 403)
    // Even the PoseRef page's own origin: the page talks over /ws, never to these endpoints.
    assert.equal((await post(port, '/poseref/bridge', { method: 'getScene' }, { Origin: `http://127.0.0.1:${port}` })).status, 403)
  })

  test('the bridge and shutdown need the bearer secret', async () => {
    assert.equal((await post(port, '/poseref/bridge', { method: 'getScene' }, { Authorization: '' })).status, 401)
    assert.equal((await post(port, '/poseref/bridge', { method: 'getScene' }, { Authorization: `Bearer ${'0'.repeat(64)}` })).status, 401)
    assert.equal((await post(port, '/poseref/shutdown', {}, { Authorization: 'Bearer nope' })).status, 401)
    assert.equal(shutdowns, 0)
  })

  test('the bridge validates what it forwards', async () => {
    assert.equal((await post(port, '/poseref/bridge', 'not json')).status, 400)
    assert.equal((await post(port, '/poseref/bridge', { method: 'getScene' }, { 'Content-Type': 'text/plain' })).status, 415)
    assert.equal((await post(port, '/poseref/bridge', { method: 'eval' })).status, 400)
    assert.equal((await post(port, '/poseref/bridge', { method: '__proto__' })).status, 400)
    const badBone = await post(port, '/poseref/bridge', { method: 'setScene', params: { pose: { bones: { tail: { x: 1 } } } } })
    assert.equal(badBone.status, 400)
    assert.equal((await post(port, '/poseref/bridge', { method: 'getScene', params: 'x'.repeat(300 * 1024) })).status, 413)
  })

  test('without a browser tab the bridge explains what to do', async () => {
    const { status, body } = await post(port, '/poseref/bridge', { method: 'getScene' })
    assert.equal(status, 503)
    assert.equal(body.ok, false)
    assert.match(String(body.error), /No PoseRef browser tab/)
  })

  test('with a tab, requests reach it', async () => {
    const tab = await fakeTab(port)
    try {
      const { body } = await post(port, '/poseref/bridge', { method: 'getScene' })
      assert.deepEqual(body, { ok: true, result: { version: 1, echo: 'getScene' } })
    } finally {
      tab.close()
    }
  })

  test('shutdown with the secret calls the owner', async () => {
    assert.equal((await post(port, '/poseref/shutdown', {})).status, 200)
    assert.equal(shutdowns, 1)
  })
})

describe('RemoteBridge (the stdio side)', () => {
  test('starts the server when nothing is listening, then talks to it', async () => {
    const port = await freePort()
    let server: ReturnType<typeof createPoseRefServer> | null = null
    let tab: WebSocket | null = null
    const bridge = new RemoteBridge({
      port,
      secret,
      openBrowser: false,
      log: noop,
      startServer: () => {
        server = createPoseRefServer({ port, secret, version: '9.9.9' })
        void server.listen().then(async () => {
          tab = await fakeTab(port)
        })
      },
    })
    try {
      assert.deepEqual(await bridge.request('getScene', {}), { version: 1, echo: 'getScene' })
    } finally {
      ;(tab as WebSocket | null)?.close()
      await (server as ReturnType<typeof createPoseRefServer> | null)?.close()
    }
  })

  test('never sends anything to another program on the port, even one that imitates PoseRef', async () => {
    const port = await freePort()
    const received: string[] = []
    const impostor: Server = createHttpServer((req, res) => {
      received.push(`${req.method} ${req.url}`)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ app: 'poseref', version: '9.9.9', tabs: 1, proof: 'f'.repeat(64) }))
    })
    await new Promise<void>((resolve) => impostor.listen(port, '127.0.0.1', resolve))
    let started = false
    const bridge = new RemoteBridge({ port, secret, openBrowser: false, log: noop, startServer: () => (started = true) })
    try {
      await assert.rejects(bridge.request('setScene', { pose: { bones: {} } }), /used by another program/)
      assert.equal(started, false)
      assert.ok(received.every((line) => line.startsWith('GET /poseref/identify')), `unexpected requests: ${received.join(', ')}`)
    } finally {
      await new Promise((resolve) => impostor.close(resolve))
    }
  })
})
