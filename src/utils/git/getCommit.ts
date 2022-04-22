import * as getStream from 'get-stream'
import gitLogParser, { Commit } from 'git-log-parser'

export async function getCommit(hash: string): Promise<Commit | undefined> {
  const result = await getStream.array<Commit>(
    gitLogParser.parse(
      {
        _: hash,
        n: 1,
      },
      {}
    )
  )

  return result?.[0]
}
