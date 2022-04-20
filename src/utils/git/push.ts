import { execAsync } from '../execAsync'

export async function push(): Promise<void> {
  await execAsync(`git push`)
  await execAsync('git push --tags')
}
