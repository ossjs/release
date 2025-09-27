import { until } from 'until-async'
import { execAsync } from '#/src/utils/exec-async.js'

export interface TagPointer {
  tag: string
  hash: string
}

/**
 * Get tag pointer by tag name.
 */
export async function getTag(tag: string): Promise<TagPointer | undefined> {
  const [commitHashError, commitHashData] = await until(() => {
    return execAsync(`git rev-list -n 1 ${tag}`)
  })

  // Gracefully handle the errors.
  // Getting commit hash by tag name can fail given an unknown tag.
  if (commitHashError) {
    return undefined
  }

  return {
    tag,
    hash: commitHashData.stdout.trim(),
  }
}
