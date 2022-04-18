import * as semver from 'semver'
import { run } from '../run'

export interface ReleasePointer {
  tag: string
  hash: string
}

export function getLatestRelease(tags: string[]): ReleasePointer | null {
  const allTags = tags.sort((left, right) => {
    return semver.rcompare(left, right)
  })
  const [latestTag] = allTags

  if (!latestTag) {
    return null
  }

  const hash = run(`git rev-list -n 1 ${latestTag}`)

  return {
    tag: latestTag,
    hash,
  }
}
