import { execAsync } from '#/src/utils/execAsync.js'

/**
 * Return the list of tags present on the current Git branch.
 */
export async function getTags(): Promise<Array<string>> {
  const allTags = await execAsync('git tag --merged').then(
    ({ stdout }) => stdout,
  )

  return allTags.split('\n').filter(Boolean)
}
