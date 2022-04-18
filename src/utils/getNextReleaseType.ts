import * as semver from 'semver'
import * as gitLogParser from 'git-log-parser'

export function getNextReleaseType(
  commits: gitLogParser.Commit[]
): semver.ReleaseType | null {
  const ranges: ['minor' | null, 'patch' | null] = [null, null]

  for (const commit of commits) {
    /**
     * @fixme This message is not the only way to denote a breaking change.
     * @ see https://www.conventionalcommits.org/en/v1.0.0/#summary
     */
    if (commit.body.startsWith('BREAKING CHANGE:')) {
      return 'major'
    }

    switch (true) {
      case commit.subject.startsWith('feat:'): {
        ranges[0] = 'minor'
        break
      }

      case commit.subject.startsWith('fix:'): {
        ranges[1] = 'patch'
        break
      }
    }
  }

  return ranges[0] || ranges[1]
}
