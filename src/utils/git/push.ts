import { execAsync } from '#/src/utils/execAsync.js'

export async function push(): Promise<void> {
  await execAsync(`git push`)
}
