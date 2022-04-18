import { invariant } from 'outvariant'
import * as semver from 'semver'

export function getNextVersion(
  previousVersion: string,
  releaseType: semver.ReleaseType
): string {
  const nextVersion = semver.inc(previousVersion, releaseType)

  invariant(
    nextVersion,
    'Failed to calculate the next version from "%s" using release type "%s"',
    previousVersion,
    releaseType
  )

  return nextVersion
}
