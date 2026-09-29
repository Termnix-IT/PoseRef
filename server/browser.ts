import { spawn } from 'node:child_process'

/**
 * Opens the PoseRef page in the default browser. The URL is always one PoseRef
 * built itself (http://127.0.0.1:<port>), and no shell is involved, so nothing
 * from outside can reach the command line.
 */
export function openBrowser(url: string, log: (message: string) => void): void {
  if (!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)) throw new Error(`Refusing to open unexpected URL: ${url}`)
  const [command, args] =
    process.platform === 'win32'
      ? ['explorer.exe', [url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]]
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true })
  child.on('error', () => log(`ブラウザで ${url} を開いてください。`))
  child.unref()
}
