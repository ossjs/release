import * as getStream from 'get-stream'
import * as gitLogParser from 'git-log-parser'
import { execAsync } from '../execAsync'

interface GetCommitsOptions {
  since?: string
  until?: string
}

/**
 * Return the list of parsed commits within the given range.
 */
export function getCommits({
  since,
  until = 'HEAD',
}: GetCommitsOptions = {}): Promise<gitLogParser.Commit[]> {
  Object.assign(gitLogParser.fields, {
    hash: 'H',
    message: 'B',
  })

  const range: string = since ? `${since}..${until}` : until

  // When only the "until" commit is specified, skip the first commit.
  const skip = range === until && until !== 'HEAD' ? 1 : undefined

  return getStream.array<gitLogParser.Commit>(
    gitLogParser.parse(
      {
        _: range,
        skip,
      },
      {
        cwd: execAsync.contextOptions.cwd,
      },
    ),
  )
}
