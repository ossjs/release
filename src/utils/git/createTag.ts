import { execAsync } from '../execAsync'

export async function createTag(tag: string): Promise<void> {
  await execAsync(`git tag ${tag}`)
}
