import { PassThrough } from 'node:stream'
import type { Commit } from 'git-log-parser'
import * as parseCommit from 'conventional-commits-parser'
import type { Commit as ParsedCommit } from 'conventional-commits-parser'
import type { ReleaseContext } from './createContext'

export type ParsedCommitWithHash = ParsedCommit & {
  hash: string
}

export type ReleaseNotes = Map<string, Set<ParsedCommitWithHash>>

const IGNORE_COMMIT_TYPE = ['chore']

export async function getReleaseNotes(
  commits: Commit[]
): Promise<ReleaseNotes> {
  const commitParser = parseCommit()
  const through = new PassThrough()

  const commitMap: Record<string, Commit> = {}

  for (const commit of commits) {
    commitMap[commit.subject] = commit
    through.write(commit.subject)
  }
  through.end()

  const releaseNotes: ReleaseNotes = new Map<
    string,
    Set<ParsedCommitWithHash>
  >()

  return new Promise((resolve, reject) => {
    through
      .pipe(commitParser)
      .on('error', reject)
      .on('data', (parsedCommit: ParsedCommit) => {
        const { type, header, merge } = parsedCommit

        if (!type || !header || merge || IGNORE_COMMIT_TYPE.includes(type)) {
          return
        }

        const originalCommit = commitMap[header]

        const parsedCommitWithHash: ParsedCommitWithHash = Object.assign(
          {},
          parsedCommit,
          {
            hash: originalCommit.hash,
          }
        )

        const nextCommits =
          releaseNotes.get(type) || new Set<ParsedCommitWithHash>()
        releaseNotes.set(type, nextCommits.add(parsedCommitWithHash))
      })
      .on('end', () => {
        resolve(releaseNotes)
      })
  })
}

export function toMarkdown(
  context: ReleaseContext,
  notes: ReleaseNotes
): string {
  const markdown: string[] = []

  const releaseDate = context.nextRelease.publishedAt.toLocaleDateString(
    'en-GB',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  )
  markdown.push(`## ${context.nextRelease.tag} (${releaseDate})`)

  const sections: Record<'feat' | 'fix', string[]> = {
    feat: [],
    fix: [],
  }

  for (const [commitType, commits] of notes) {
    const section = sections[commitType as 'feat' | 'fix']

    if (!section) {
      continue
    }

    for (const commit of commits) {
      const releaseItem = createReleaseItem(commit)

      if (releaseItem) {
        section.push(releaseItem)
      }
    }
  }

  if (sections.feat.length > 0) {
    markdown.push('', '### Features', '')
    markdown.push(...sections.feat)
  }

  if (sections.fix.length > 0) {
    markdown.push('', '### Bug Fixes', '')
    markdown.push(...sections.fix)
  }

  return markdown.join('\n')
}

function createReleaseItem(commit: ParsedCommitWithHash): string | undefined {
  const { subject, scope, hash } = commit

  if (subject) {
    const commitLine = [scope && `**${scope}:**`, subject, `(${hash})`]
      .filter(Boolean)
      .join(' ')

    return `- ${commitLine}`
  }
}
