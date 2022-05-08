import type { Commit } from 'git-log-parser'
import { execAsync } from '../execAsync'
import { getCommit } from './getCommit'
import { parseCommits, ParsedCommitWithHash } from './parseCommits'

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
  const hash = await execAsync('git log --pretty=format:%H -n 1')
  const commit = (await getCommit(hash)) as Commit

  const [commitInfo] = await parseCommits([commit])
  return commitInfo
}
