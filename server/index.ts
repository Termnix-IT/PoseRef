import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createPoseRefServer } from './app.ts'
import { resolvePort } from './port.ts'

const distDir = fileURLToPath(new URL('../dist', import.meta.url))

function openBrowser(url: string): void {
  const [command, args] =
    process.platform === 'win32'
      ? ['explorer.exe', [url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]]
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.on('error', () => console.log(`ブラウザで ${url} を開いてください。`))
  child.unref()
}

if (!existsSync(distDir)) {
  console.error('dist/ がありません。先に npm run build を実行してください（npm start は自動でビルドします）。')
  process.exit(1)
}

const port = resolvePort()
const server = createPoseRefServer({ port, staticDir: distDir })

try {
  await server.listen()
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
    console.error(
      `ポート ${port} は使用中です。PoseRef が既に起動していないか確認してください。` +
        '別のポートを使う場合は POSEREF_PORT を指定し、エージェントに登録した MCP の URL も合わせて変更してください。',
    )
    process.exit(1)
  }
  throw error
}

console.log(`PoseRef:   ${server.appUrl}`)
console.log(`MCP (AI):  ${server.mcpUrl}`)
console.log('終了するには Ctrl+C を押してください。')
if (!process.env.POSEREF_NO_OPEN) openBrowser(server.appUrl)

const shutdown = () => {
  void server.close().then(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
