import { isBreakingChange } from '../getNextReleaseType'
import type { ParsedCommitWithHash } from '../git/parseCommits'
import { getCommitAuthors } from '../github/getCommitAuthors'

export type ReleaseNoteType = 'breaking' | 'feat' | 'fix'

export type GroupedCommits = Map<ReleaseNoteType, Set<ParsedCommitWithHash>>

export type ReleaseNoteCommit = ParsedCommitWithHash & {
  [key: string]: any
  authors: Set<string>
}

export type ReleaseNotes = Map<ReleaseNoteType, Set<ReleaseNoteCommit>>

const IGNORED_COMMIT_TYPES = ['chore']

export async function getReleaseNotes(
  commits: ParsedCommitWithHash[],
): Promise<ReleaseNotes> {
  const groupedNotes = await groupCommitsByReleaseType(commits)
  const notes = await injectReleaseContributors(groupedNotes)

  return notes
}

export async function groupCommitsByReleaseType(
  commits: ParsedCommitWithHash[],
): Promise<GroupedCommits> {
  const groups: GroupedCommits = new Map()

  for (const commit of commits) {
    const { type, merge } = commit

    // Skip commits without a type, merge commits, and commit
    // types that repesent internal changes (i.e. "chore").
    if (!type || merge || IGNORED_COMMIT_TYPES.includes(type)) {
      continue
    }

    const noteType: ReleaseNoteType = isBreakingChange(commit)
      ? 'breaking'
      : (type as ReleaseNoteType)

    const prevCommits = groups.get(noteType) || new Set<ParsedCommitWithHash>()

    groups.set(noteType, prevCommits.add(commit))
  }

  return groups
}

export async function injectReleaseContributors(
  groups: GroupedCommits,
): Promise<ReleaseNotes> {
  const notes: ReleaseNotes = new Map()
  const queue: Promise<void>[] = []

  for (const [releaseType, commits] of groups) {
    notes.set(releaseType, new Set())

    for (const commit of commits) {
      queue.push(
        new Promise(async (resolve, reject) => {
          const authors = await getCommitAuthors(commit).catch(reject)

          if (authors) {
            const releaseCommit = Object.assign<
              {},
              ParsedCommitWithHash,
              Pick<ReleaseNoteCommit, 'authors'>
            >({}, commit, {
              authors,
            })

            notes.get(releaseType)?.add(releaseCommit)
          }

          return resolve()
        }),
      )
    }
  }

  await Promise.allSettled(queue)

  return notes
}
