import { PassThrough } from 'node:stream'
import type { Commit } from 'git-log-parser'
import * as parseCommit from 'conventional-commits-parser'
import type { Commit as ParsedCommit } from 'conventional-commits-parser'
import type { ReleaseContext } from './createContext'

export type ReleaseNotes = Map<string, Set<ParsedCommit>>

const IGNORE_COMMIT_TYPE = ['chore']

export async function getReleaseNotes(
  commits: Commit[]
): Promise<ReleaseNotes> {
  const commitParser = parseCommit()
  const through = new PassThrough()

  for (const commit of commits) {
    through.write(commit.subject)
  }
  through.end()

  const releaseNotes: ReleaseNotes = new Map()

  return new Promise((resolve, reject) => {
    through
      .pipe(commitParser)
      .on('error', reject)
      .on('data', (commit: ParsedCommit) => {
        const { type, merge } = commit

        if (!type || merge || IGNORE_COMMIT_TYPE.includes(type)) {
          return
        }

        const nextCommits = releaseNotes.get(type) || new Set<ParsedCommit>()
        releaseNotes.set(type, nextCommits.add(commit))
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
  markdown.push(`## ${context.nextRelease.version} (${releaseDate})`)

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

function createReleaseItem(commit: ParsedCommit): string | undefined {
  const { subject, scope } = commit

  if (subject) {
    const commitLine = [scope && `**${scope}:**`, subject]
      .filter(Boolean)
      .join(' ')

    return `- ${commitLine}`
  }
}
