import { execAsync } from '#/src/utils/exec-async.js'

export async function createTag(tag: string): Promise<string> {
  await execAsync(`git tag ${tag}`)
  const latestTag = await execAsync(`git describe --tags --abbrev=0`).then(
    ({ stdout }) => stdout,
  )

  return latestTag.trim()
}
