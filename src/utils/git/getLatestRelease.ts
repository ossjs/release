import * as semver from 'semver'
import { getTag, TagPointer } from './getTag'

export function byReleaseVersion(left: string, right: string): number {
  return semver.rcompare(left, right)
}

export async function getLatestRelease(
  tags: string[],
): Promise<TagPointer | undefined> {
  const allTags = tags.filter((tag) => {
    return semver.valid(tag)
  }).sort(byReleaseVersion)
  const [latestTag] = allTags

  if (!latestTag) {
    return
  }

  return getTag(latestTag)
}
