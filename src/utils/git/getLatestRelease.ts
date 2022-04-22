import * as semver from 'semver'
import { execAsync } from '../execAsync'

export interface ReleasePointer {
  tag: string
  hash: string
}

export async function getLatestRelease(
  tags: string[]
): Promise<ReleasePointer | undefined> {
  const allTags = tags.sort((left, right) => {
    return semver.rcompare(left, right)
  })
  const [latestTag] = allTags

  if (!latestTag) {
    return
  }

  const hash = await execAsync(`git rev-list -n 1 ${latestTag}`)

  return {
    tag: latestTag,
    hash,
  }
}
