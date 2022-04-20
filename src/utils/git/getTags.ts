import { execAsync } from '../execAsync'

/**
 * Return the list of tags present on the current Git branch.
 */
export async function getTags(): Promise<string[]> {
  const allTags = await execAsync('git tag')
  return allTags.split('\n').filter(Boolean)
}
