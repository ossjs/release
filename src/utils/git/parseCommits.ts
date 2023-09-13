import { PassThrough } from 'node:stream'
import { invariant } from 'outvariant'
import { DeferredPromise } from '@open-draft/deferred-promise'
import type { Commit } from 'git-log-parser'
import parseCommit from 'conventional-commits-parser'
import type { Commit as ParsedCommit } from 'conventional-commits-parser'

export type ParsedCommitWithHash = ParsedCommit & {
  hash: string
  typeAppendix?: '!' | (string & {})
}

const COMMIT_HEADER_APPENDIX_REGEXP = /^(.+)(!)(:)/g

export async function parseCommits(
  commits: Commit[],
): Promise<Array<ParsedCommitWithHash>> {
  const through = new PassThrough()
  const commitMap: Map<string, Commit> = new Map()

  for (const commit of commits) {
    commitMap.set(commit.subject, commit)
    const message = joinCommit(commit.subject, commit.body)
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

  const parsedCommits: Array<ParsedCommitWithHash> = []

  through
    .pipe(commitParser)
    .on('error', (error) => parsingStreamPromise.reject(error))
    .on('data', (parsedCommit: ParsedCommit) => {
      let resolvedParsingResult = parsedCommit

      if (!parsedCommit.header) {
        return
      }

      let typeAppendix

      if (COMMIT_HEADER_APPENDIX_REGEXP.test(parsedCommit.header)) {
        const headerWithoutAppendix = parsedCommit.header.replace(
          COMMIT_HEADER_APPENDIX_REGEXP,
          '$1$3',
        )
        resolvedParsingResult = parseCommit.sync(
          joinCommit(headerWithoutAppendix, parsedCommit.body),
        )
        typeAppendix = '!'
      }

      const originalCommit = commitMap.get(parsedCommit.header)

      invariant(
        originalCommit,
        'Failed to parse commit "%s": no original commit found associated with header',
        parsedCommit.header,
      )

      const commit: ParsedCommitWithHash = Object.assign(
        {},
        resolvedParsingResult,
        {
          hash: originalCommit.hash,
          typeAppendix,
        },
      )
      parsedCommits.push(commit)
    })
    .on('end', () => parsingStreamPromise.resolve(parsedCommits))

  return parsingStreamPromise
}

function joinCommit(subject: string, body: string | null | undefined) {
  return [subject, body].filter(Boolean).join('\n')
}
