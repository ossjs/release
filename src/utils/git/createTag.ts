import { execAsync } from '../execAsync'

export async function createTag(tag: string): Promise<string> {
  await execAsync(`git tag ${tag}`)
  const latestTag = await execAsync(`git describe --tags --abbrev=0`)

  return latestTag.trim()
}
