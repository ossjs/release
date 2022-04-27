import type { ReleaseContext } from './createContext'
import type { ParsedCommitWithHash } from './git/parseCommits'

export type ReleaseNotes = Map<string, Set<ParsedCommitWithHash>>

const IGNORE_COMMIT_TYPE = ['chore']

export async function getReleaseNotes(
  commits: ParsedCommitWithHash[]
): Promise<ReleaseNotes> {
  const releaseNotes: ReleaseNotes = new Map<
    string,
    Set<ParsedCommitWithHash>
  >()

  for (const commit of commits) {
    const { type, merge } = commit

    if (!type || merge || IGNORE_COMMIT_TYPE.includes(type)) {
      continue
    }

    const nextCommits =
      releaseNotes.get(type) || new Set<ParsedCommitWithHash>()
    releaseNotes.set(type, nextCommits.add(commit))
  }

  return releaseNotes
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
