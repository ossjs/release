import { execAsync } from '../execAsync'

export async function getCurrentBranch(): Promise<string> {
  return execAsync('git rev-parse --abbrev-ref HEAD').then((out) => out.trim())
}
