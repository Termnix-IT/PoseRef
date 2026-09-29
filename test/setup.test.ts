import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { appendCodexApprovals, mcpLaunchCommand } from '../server/setup.ts'

describe('MCP launch command', () => {
  test('pins the exact version and wraps npx in cmd /c on Windows', () => {
    assert.deepEqual(mcpLaunchCommand('1.2.3', 'linux'), ['npx', '-y', 'poseref@1.2.3', 'mcp'])
    assert.deepEqual(mcpLaunchCommand('1.2.3', 'win32'), ['cmd', '/c', 'npx', '-y', 'poseref@1.2.3', 'mcp'])
    assert.deepEqual(mcpLaunchCommand('1.2.3-beta.1', 'darwin'), ['npx', '-y', 'poseref@1.2.3-beta.1', 'mcp'])
  })

  test('rejects anything that is not a plain version', () => {
    assert.throws(() => mcpLaunchCommand('latest'))
    assert.throws(() => mcpLaunchCommand('1.2.3 && calc'))
    assert.throws(() => mcpLaunchCommand('1.2.3;rm'))
  })
})

describe('Codex approval settings', () => {
  test('adds every non-read-only tool to an empty config', () => {
    const { text, added } = appendCodexApprovals('')
    assert.deepEqual(added, ['set_scene', 'reach', 'open_poseref'])
    assert.match(text, /^# Added by `poseref setup`/)
    assert.match(text, /\[mcp_servers\.poseref\.tools\.set_scene\]\napproval_mode = "approve"\n/)
    assert.match(text, /\[mcp_servers\.poseref\.tools\.reach\]\napproval_mode = "approve"\n/)
    assert.match(text, /\[mcp_servers\.poseref\.tools\.open_poseref\]\napproval_mode = "approve"\n/)
  })

  test('keeps the existing file untouched and appends after a blank line', () => {
    const existing = 'model = "gpt-6-sol"\n# my comment\n[mcp_servers.poseref]\ncommand = "npx"'
    const { text } = appendCodexApprovals(existing)
    assert.ok(text.startsWith(`${existing}\n\n# Added by`))
  })

  test('is idempotent', () => {
    const once = appendCodexApprovals('model = "x"\n').text
    const twice = appendCodexApprovals(once)
    assert.deepEqual(twice.added, [])
    assert.equal(twice.text, once)
  })

  test('only adds the tables that are missing and never rewrites existing ones', () => {
    const existing = '[mcp_servers.poseref.tools.set_scene]\napproval_mode = "prompt"\n'
    const { text, added } = appendCodexApprovals(existing)
    assert.deepEqual(added, ['reach', 'open_poseref'])
    assert.ok(text.includes('approval_mode = "prompt"'))
    assert.equal(text.match(/tools\.set_scene\]/g)?.length, 1)
  })
})

describe('registration environment', () => {
  test('passes on only a non-default port', async () => {
    const { registrationEnv } = await import('../server/setup.ts')
    assert.deepEqual(registrationEnv(47173), [])
    assert.deepEqual(registrationEnv(48000), ['--env', 'POSEREF_PORT=48000'])
  })
})

describe('shell command line (Windows)', () => {
  test('joins safe pieces and refuses anything a shell could interpret', async () => {
    const { shellCommandLine } = await import('../server/setup.ts')
    assert.equal(
      shellCommandLine('claude', ['mcp', 'add', '--scope', 'user', 'poseref', '--env', 'POSEREF_PORT=48000', '--', 'cmd', '/c', 'npx', '-y', 'poseref@0.1.1', 'mcp']),
      'claude mcp add --scope user poseref --env POSEREF_PORT=48000 -- cmd /c npx -y poseref@0.1.1 mcp',
    )
    for (const bad of ['a b', 'a&calc', 'a|b', 'a>b', '"x"', '%PATH%', 'a^b', '$(x)', '']) {
      assert.throws(() => shellCommandLine('codex', ['mcp', bad]), /unexpected argument/, bad)
    }
  })
})
