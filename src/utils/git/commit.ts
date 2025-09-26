import type { Commit } from 'git-log-parser'
import { execAsync } from '#/src/utils/execAsync.js'
import { getCommit } from './getCommit.js'
import { parseCommits, type ParsedCommitWithHash } from './parseCommits.js'

export interface CommitOptions {
  message: string
  files?: string[]
  allowEmpty?: boolean
  date?: Date
}

export async function commit({
  files,
  message,
  allowEmpty,
  date,
}: CommitOptions): Promise<ParsedCommitWithHash> {
  if (files) {
    await execAsync(`git add ${files.join(' ')}`)
  }

  const args: string[] = [
    `-m "${message}"`,
    allowEmpty ? '--allow-empty' : '',
    date ? `--date "${date.toISOString()}"` : '',
  ]

  await execAsync(`git commit ${args.join(' ')}`)
  const hash = await execAsync('git log --pretty=format:%H -n 1').then(
    ({ stdout }) => stdout,
  )
  const commit = (await getCommit(hash)) as Commit

  const [commitInfo] = await parseCommits([commit])
  return commitInfo
}
