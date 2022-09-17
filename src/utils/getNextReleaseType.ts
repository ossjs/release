import * as semver from 'semver'
import { ParsedCommitWithHash } from './git/parseCommits'

/**
 * Determine if the given commit describes a breaking change.
 * @note For now, this only analyzes the "BREAKING CHANGE" comment
 * in the commit's body.
 */
export function isBreakingChange(commit: ParsedCommitWithHash): boolean {
  return commit.notes.some((note) => note.title === 'BREAKING CHANGE')
}

export function getNextReleaseType(
  commits: ParsedCommitWithHash[],
): semver.ReleaseType | null {
  const ranges: ['minor' | null, 'patch' | null] = [null, null]

  for (const commit of commits) {
    if (isBreakingChange(commit)) {
      return 'major'
    }

    // Respect the parsed "type" from the "conventional-commits-parser".
    switch (commit.type) {
      case 'feat': {
        ranges[0] = 'minor'
        break
      }

      case 'fix': {
        ranges[1] = 'patch'
        break
      }
    }
  }

  /**
   * @fixme Commit messages can also append "!" to the scope
   * to indicate that the commit is a breaking change.
   * @see https://www.conventionalcommits.org/en/v1.0.0/#summary
   *
   * Unfortunately, "conventional-commits-parser" does not support that.
   */

  return ranges[0] || ranges[1]
}
