import { execAsync } from '#/src/utils/exec-async.js'

export async function push(): Promise<void> {
  await execAsync(`git push`)
}
