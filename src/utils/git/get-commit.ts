import * as getStream from 'get-stream'
import gitLogParser, { type Commit } from 'git-log-parser'
import { execAsync } from '#/src/utils/exec-async.js'

export async function getCommit(hash: string): Promise<Commit | undefined> {
  Object.assign(gitLogParser.fields, {
    hash: 'H',
    message: 'B',
  })

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
      },
    ),
  )

  return result?.[0]
}
