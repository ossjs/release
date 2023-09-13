import { PassThrough } from 'stream'
import type { Commit } from 'git-log-parser'
import parseCommit from 'conventional-commits-parser'
import type { Commit as ParsedCommit } from 'conventional-commits-parser'
import { DeferredPromise } from '@open-draft/deferred-promise'

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

  const parsingStreamPromise = new DeferredPromise<
    Array<ParsedCommitWithHash>
  >()
  parsingStreamPromise.finally(() => {
    through.destroy()
  })

  const parsedCommits: ParsedCommitWithHash[] = []

  through
    .pipe(commitParser)
    .on('error', (error) => parsingStreamPromise.reject(error))
    .on('data', (parsedCommit: ParsedCommit) => {
      const { header } = parsedCommit

      if (!header) {
        return
      }

      const originalCommit = commitMap[header]
      const commit: ParsedCommitWithHash = Object.assign({}, parsedCommit, {
        hash: originalCommit.hash,
      })
      parsedCommits.push(commit)
    })
    .on('end', () => parsingStreamPromise.resolve(parsedCommits))

  return parsingStreamPromise
}
