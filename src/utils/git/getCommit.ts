import * as getStream from 'get-stream'
import gitLogParser, { Commit } from 'git-log-parser'
import { execAsync } from '../execAsync'

export async function getCommit(hash: string): Promise<Commit | undefined> {
  const result = await getStream.array<Commit>(
    gitLogParser.parse(
      {
        _: hash,
        n: 1,
      },
      {
        // Respect the global working directory so this command
        // parses commits on test repositories during tests.
        cwd: execAsync.contextOptions.cwd,
      }
    )
  )

  return result?.[0]
}
