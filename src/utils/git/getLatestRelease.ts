import * as semver from 'semver'
import { execAsync } from '../execAsync'

export interface ReleasePointer {
  tag: string
  hash: string
}

export async function getLatestRelease(
  tags: string[]
): Promise<ReleasePointer | null> {
  const allTags = tags.sort((left, right) => {
    return semver.rcompare(left, right)
  })
  const [latestTag] = allTags

  if (!latestTag) {
    return null
  }

  const hash = await execAsync(`git rev-list -n 1 ${latestTag}`)

  return {
    tag: latestTag,
    hash,
  }
}
