import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { DEFAULT_PORT, resolvePort } from './port.ts'

/**
 * Tools that are not read-only: two change the scene and open_poseref opens a
 * browser tab. Codex asks before each call unless they are approved in config.toml.
 */
export const WRITE_TOOLS = ['set_scene', 'reach', 'open_poseref'] as const

/**
 * The command agents run to start PoseRef's stdio MCP server. The version is
 * pinned so a later release (or a compromised one) never runs without the user
 * re-running setup. Windows needs `cmd /c` because npx is a .cmd script there.
 */
export function mcpLaunchCommand(version: string, platform = process.platform): string[] {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/.test(version)) throw new Error(`Unexpected version: ${version}`)
  const npx = ['npx', '-y', `poseref@${version}`, 'mcp']
  return platform === 'win32' ? ['cmd', '/c', ...npx] : npx
}

/**
 * Appends approval tables for the write tools that are not configured yet.
 * Append-only on purpose: rewriting the file with a TOML library would drop the
 * user's comments and ordering. Existing tables are left exactly as they are.
 */
export function appendCodexApprovals(toml: string, server = 'poseref'): { text: string; added: string[] } {
  const added = WRITE_TOOLS.filter((tool) => {
    const header = new RegExp(`^\\s*\\[\\s*mcp_servers\\.${server}\\.tools\\.${tool}\\s*\\]`, 'm')
    return !header.test(toml)
  })
  if (added.length === 0) return { text: toml, added }
  const blocks = added.map((tool) => `[mcp_servers.${server}.tools.${tool}]\napproval_mode = "approve"\n`)
  const separator = toml.length === 0 || toml.endsWith('\n\n') ? '' : toml.endsWith('\n') ? '\n' : '\n\n'
  const note = '# Added by `poseref setup`: these tools only change or open the PoseRef tab; scene changes can be undone there.\n'
  return { text: `${toml}${separator}${note}${blocks.join('\n')}`, added: [...added] }
}

/**
 * Environment flags for the registration. Only a non-default POSEREF_PORT is
 * passed on, so agents start and look for PoseRef on the same port as the user.
 * The flags go after the server name: `claude mcp add --env` takes several
 * values and would swallow the name, while `--` ends the list.
 */
export function registrationEnv(port = resolvePort()): string[] {
  return port === DEFAULT_PORT ? [] : ['--env', `POSEREF_PORT=${port}`]
}

interface CommandResult {
  ok: boolean
  output: string
}

/** Every argument PoseRef passes to another CLI is a fixed word or a version, never user text. */
const SAFE_ARG = /^[\w@.:/=-]+$/

/**
 * Joins a command for the Windows shell. claude and codex are .cmd shims there,
 * which Node can only start through a shell; building the line ourselves (rather
 * than passing an args array with `shell: true`, which Node deprecates because it
 * concatenates without escaping) keeps the check on every piece explicit. Pieces
 * are limited to SAFE_ARG, which has no spaces or shell metacharacters, so they
 * need no quoting.
 */
export function shellCommandLine(command: string, args: string[]): string {
  for (const arg of [command, ...args]) {
    if (!SAFE_ARG.test(arg)) throw new Error(`Refusing to run a command with an unexpected argument: ${arg}`)
  }
  return [command, ...args].join(' ')
}

function run(command: string, args: string[]): CommandResult {
  const line = shellCommandLine(command, args)
  const options = { encoding: 'utf8', windowsHide: true, timeout: 60_000 } as const
  const result =
    process.platform === 'win32' ? spawnSync(line, { ...options, shell: true }) : spawnSync(command, args, options)
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() }
}

function codexConfigPath(): string {
  return join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'config.toml')
}

export interface SetupOptions {
  version: string
  yes: boolean
  dryRun: boolean
  log: (message: string) => void
}

interface Step {
  describe: string
  apply: () => void
}

/** Replacing removes the old entry first (the CLIs refuse duplicates), so a failed add leaves none. */
const REMOVED_NOTE = ' (the previous "poseref" entry was already removed; run `npx poseref setup` again)'

function claudeSteps(launch: string[], env: string[], log: (m: string) => void): Step[] {
  if (!run('claude', ['--version']).ok) {
    log('- Claude Code: not found (skipped)')
    return []
  }
  const exists = run('claude', ['mcp', 'get', 'poseref']).ok
  return [
    {
      describe: `${exists ? 'Replace' : 'Add'} the "poseref" MCP server for all projects: claude mcp add --scope user ${['poseref', ...env].join(' ')} -- ${launch.join(' ')}`,
      apply: () => {
        if (exists) run('claude', ['mcp', 'remove', 'poseref', '--scope', 'user'])
        const added = run('claude', ['mcp', 'add', '--scope', 'user', 'poseref', ...env, '--', ...launch])
        if (!added.ok) throw new Error(`claude mcp add failed${exists ? REMOVED_NOTE : ''}:\n${added.output}`)
      },
    },
  ]
}

function codexSteps(launch: string[], env: string[], log: (m: string) => void): Step[] {
  if (!run('codex', ['--version']).ok) {
    log('- Codex: not found (skipped)')
    return []
  }
  const exists = run('codex', ['mcp', 'get', 'poseref']).ok
  const configPath = codexConfigPath()
  return [
    {
      describe: `${exists ? 'Replace' : 'Add'} the "poseref" MCP server: codex mcp add ${['poseref', ...env].join(' ')} -- ${launch.join(' ')}`,
      apply: () => {
        if (exists) run('codex', ['mcp', 'remove', 'poseref'])
        const added = run('codex', ['mcp', 'add', 'poseref', ...env, '--', ...launch])
        if (!added.ok) throw new Error(`codex mcp add failed${exists ? REMOVED_NOTE : ''}:\n${added.output}`)
      },
    },
    {
      describe: `Let ${WRITE_TOOLS.join(', ')} run without a prompt each time: append approval settings to ${configPath} (a backup is kept next to it)`,
      apply: () => {
        const before = existsSync(configPath) ? readFileSync(configPath, 'utf8') : ''
        const { text, added } = appendCodexApprovals(before)
        if (added.length === 0) return
        const backup = `${configPath}.poseref-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`
        if (existsSync(configPath)) copyFileSync(configPath, backup)
        writeFileSync(configPath, text)
        // Let Codex itself confirm the file still parses; put the original back if not.
        if (!run('codex', ['mcp', 'get', 'poseref']).ok) {
          if (existsSync(backup)) copyFileSync(backup, configPath)
          throw new Error(`Codex could not read ${configPath} after the change, so it was restored. Add the approval settings by hand (see the README).`)
        }
        if (existsSync(backup)) log(`  backup: ${backup}`)
      },
    },
  ]
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  try {
    return /^y(es)?$/i.test((await rl.question(question)).trim())
  } finally {
    rl.close()
  }
}

/**
 * `poseref setup`: registers PoseRef with the agents found on this machine.
 * Shows every change first and asks before making any.
 */
export async function runSetup(options: SetupOptions): Promise<number> {
  const { log } = options
  const launch = mcpLaunchCommand(options.version)
  log(`PoseRef ${options.version} setup`)
  log('')
  const env = registrationEnv()
  const steps = [...claudeSteps(launch, env, log), ...codexSteps(launch, env, log)]
  if (steps.length === 0) {
    log('Neither Claude Code (`claude`) nor Codex (`codex`) was found on PATH. Install one, then run this again.')
    return 1
  }
  log('This will:')
  for (const step of steps) log(`- ${step.describe}`)
  log('')
  if (options.dryRun) {
    log('Dry run: nothing was changed.')
    return 0
  }
  if (!options.yes) {
    if (!process.stdin.isTTY) {
      log('Not running in an interactive terminal. Re-run with --yes to apply these changes.')
      return 1
    }
    if (!(await confirm('Apply these changes? [y/N] '))) {
      log('Nothing was changed.')
      return 1
    }
  }
  for (const step of steps) {
    step.apply()
  }
  log('')
  log('Done. Restart Claude Code / Codex, then ask for a pose, e.g. "PoseRefで、腕を組んで立っているポーズを作って".')
  log('PoseRef and the browser tab start the first time an agent uses a PoseRef tool.')
  return 0
}
