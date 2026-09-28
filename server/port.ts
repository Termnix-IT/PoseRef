/** Fixed default so the MCP URL registered with agents stays valid across restarts. */
export const DEFAULT_PORT = 47173

export function resolvePort(): number {
  const value = Number(process.env.POSEREF_PORT)
  return Number.isInteger(value) && value > 0 && value < 65536 ? value : DEFAULT_PORT
}
