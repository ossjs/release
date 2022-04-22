import * as semver from 'semver'
import { getTag, TagPointer } from './getTag'

export async function getLatestRelease(
  tags: string[]
): Promise<TagPointer | undefined> {
  const allTags = tags.sort((left, right) => {
    return semver.rcompare(left, right)
  })
  const [latestTag] = allTags

  if (!latestTag) {
    return
  }

  return getTag(latestTag)
}
