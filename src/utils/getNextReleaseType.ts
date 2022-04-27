import * as semver from 'semver'
import { ParsedCommitWithHash } from './git/parseCommits'

export function getNextReleaseType(
  commits: ParsedCommitWithHash[]
): semver.ReleaseType | null {
  const ranges: ['minor' | null, 'patch' | null] = [null, null]

  for (const commit of commits) {
    /**
     * @fixme This message is not the only way to denote a breaking change.
     * @ see https://www.conventionalcommits.org/en/v1.0.0/#summary
     */
    if (commit.body?.includes('BREAKING CHANGE:')) {
      return 'major'
    }

    switch (true) {
      case commit.header?.startsWith('feat:'): {
        ranges[0] = 'minor'
        break
      }

      case commit.header?.startsWith('fix:'): {
        ranges[1] = 'patch'
        break
      }
    }
  }

  return ranges[0] || ranges[1]
}
