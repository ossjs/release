import { execAsync } from '#/src/utils/execAsync.js'

export async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD')
  return stdout.trim()
}
