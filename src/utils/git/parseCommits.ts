import { PassThrough } from 'stream'
import type { Commit } from 'git-log-parser'
import parseCommit from 'conventional-commits-parser'
import type { Commit as ParsedCommit } from 'conventional-commits-parser'

export type ParsedCommitWithHash = ParsedCommit & {
  hash: string
}

export async function parseCommits(
  commits: Commit[],
): Promise<ParsedCommitWithHash[]> {
  const through = new PassThrough()
  const commitMap: Record<string, Commit> = {}

  for (const commit of commits) {
    commitMap[commit.subject] = commit
    const message = [commit.subject, commit.body].filter(Boolean).join('\n')

    through.write(message, 'utf8')
  }

  through.end()

  const commitParser = parseCommit()
  const results = await new Promise<ParsedCommitWithHash[]>(
    (resolve, reject) => {
      const commits: ParsedCommitWithHash[] = []

      through
        .pipe(commitParser)
        .on('error', (error) => reject(error))
        .on('data', (parsedCommit: ParsedCommit) => {
          const { header } = parsedCommit

          if (!header) {
            return
          }

          const originalCommit = commitMap[header]
          const commit: ParsedCommitWithHash = Object.assign({}, parsedCommit, {
            hash: originalCommit.hash,
          })
          commits.push(commit)
        })
        .on('end', () => resolve(commits))
    },
  )

  through.destroy()

  return results
}
