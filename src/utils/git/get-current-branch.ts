import { execAsync } from '#/src/utils/exec-async.js'

export async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD')
  return stdout.trim()
}
