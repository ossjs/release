import * as semver from 'semver'
import { type ParsedCommitWithHash } from '#/src/utils/git/parse-commits.js'

interface GetNextReleaseTypeOptions {
  prerelease?: boolean
}

/**
 * Returns true if the given parsed commit represents a breaking change.
 * @see https://www.conventionalcommits.org/en/v1.0.0/#summary
 */
export function isBreakingChange(commit: ParsedCommitWithHash): boolean {
  if (commit.typeAppendix === '!') {
    return true
  }

  if (commit.footer && commit.footer.includes('BREAKING CHANGE:')) {
    return true
  }

  return false
}

export function getNextReleaseType(
  commits: ParsedCommitWithHash[],
  options?: GetNextReleaseTypeOptions,
): semver.ReleaseType | null {
  const ranges: ['minor' | null, 'patch' | null] = [null, null]

  for (const commit of commits) {
    if (isBreakingChange(commit)) {
      return options?.prerelease ? 'minor' : 'major'
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
