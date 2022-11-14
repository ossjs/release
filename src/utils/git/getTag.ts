import { until } from '@open-draft/until'
import { execAsync } from '../execAsync'

export interface TagPointer {
  tag: string
  hash: string
}

/**
 * Get tag pointer by tag name.
 */
export async function getTag(tag: string): Promise<TagPointer | undefined> {
  const commitHashOut = await until(() => {
    return execAsync(`git rev-list -n 1 ${tag}`)
  })

  // Gracefully handle the errors.
  // Getting commit hash by tag name can fail given an unknown tag.
  if (commitHashOut.error) {
    return undefined
  }

  return {
    tag,
    hash: commitHashOut.data.stdout.trim(),
  }
}
