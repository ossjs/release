import { PassThrough } from 'node:stream'
import type { Commit } from 'git-log-parser'
import * as parseCommit from 'conventional-commits-parser'
import type { Commit as ParsedCommit } from 'conventional-commits-parser'
import type { ReleaseContext } from '../commands/publish'

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

const SECTION_NAMES: Record<string, string> = {
  feat: 'Features',
  fix: 'Bug Fixes',
}

export function toMarkdown(
  release: ReleaseContext,
  notes: ReleaseNotes
): string {
  const markdown: string[] = []

  const releaseDate = release.publishedAt.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  markdown.push(`## ${release.version} (${releaseDate})`)

  for (const [commitType, commits] of notes) {
    const sectionName = SECTION_NAMES[commitType]
    if (!sectionName) {
      continue
    }

    markdown.push('', `### ${sectionName}`, '')

    for (const commit of commits) {
      const { subject, scope } = commit

      if (subject) {
        const commitLine = [scope && `**${scope}:**`, subject].join(' ')
        markdown.push(`- ${commitLine}`)
      }
    }
  }

  return markdown.join('\n')
}
