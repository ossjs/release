import type { ReleaseContext } from './createContext'
import { formatDate } from './formatDate'
import { isBreakingChange } from './getNextReleaseType'
import type { ParsedCommitWithHash } from './git/parseCommits'

export type ReleaseNoteType = 'breaking' | 'feat' | 'fix'
export type ReleaseNotes = Map<ReleaseNoteType, Set<ParsedCommitWithHash>>

const IGNORE_COMMIT_TYPE = ['chore']

export async function getReleaseNotes(
  commits: ParsedCommitWithHash[],
): Promise<ReleaseNotes> {
  const releaseNotes: ReleaseNotes = new Map()

  for (const commit of commits) {
    const { type, merge } = commit

    if (!type || merge || IGNORE_COMMIT_TYPE.includes(type)) {
      continue
    }

    const noteType: ReleaseNoteType = isBreakingChange(commit)
      ? 'breaking'
      : (type as ReleaseNoteType)

    const nextCommits =
      releaseNotes.get(noteType) || new Set<ParsedCommitWithHash>()
    releaseNotes.set(noteType, nextCommits.add(commit))
  }

  return releaseNotes
}

export function toMarkdown(
  context: ReleaseContext,
  notes: ReleaseNotes,
): string {
  const markdown: string[] = []
  const releaseDate = formatDate(context.nextRelease.publishedAt)

  markdown.push(`## ${context.nextRelease.tag} (${releaseDate})`)

  const sections: Record<ReleaseNoteType, string[]> = {
    breaking: [],
    feat: [],
    fix: [],
  }

  for (const [noteType, commits] of notes) {
    const section = sections[noteType]

    if (!section) {
      continue
    }

    for (const commit of commits) {
      const releaseItem = createReleaseItem(commit, noteType === 'breaking')

      if (releaseItem) {
        section.push(...releaseItem)
      }
    }
  }

  if (sections.breaking.length > 0) {
    markdown.push('', '### ⚠️ BREAKING CHANGES')
    markdown.push(...sections.breaking)
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

function createReleaseItem(
  commit: ParsedCommitWithHash,
  includeNotes: boolean = false,
): string[] {
  const { subject, scope, hash } = commit

  if (!subject) {
    return []
  }

  const commitLine: string[] = [
    ['-', scope && `**${scope}:**`, subject, `(${hash})`]
      .filter(Boolean)
      .join(' '),
  ]

  if (includeNotes) {
    const notes = commit.notes.reduce<string[]>((all, note) => {
      return all.concat('', note.text)
    }, [])

    if (notes.length > 0) {
      commitLine.unshift('')
      commitLine.push(...notes)
    }
  }

  return commitLine
}
