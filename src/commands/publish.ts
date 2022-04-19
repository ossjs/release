import { until } from '@open-draft/until'
import { getNextReleaseType } from '../utils/getNextReleaseType'
import { getNextVersion } from '../utils/getNextVersion'
import { getCommits } from '../utils/git/getCommits'
import { getCurrentBranch } from '../utils/git/getCurrentBranch'
import { getLatestRelease } from '../utils/git/getLatestRelease'
import { bumpPackageJson } from '../utils/bumpPackageJson'
import { getTags } from '../utils/git/getTags'
import { Config } from '../utils/getConfig'
import { execAsync } from '../utils/execAsync'
import { createCommit } from '../utils/git/createCommit'
import { createTag } from '../utils/git/createTag'

export async function publish(config: Config): Promise<void> {
  console.log('preparing for a new release...')

  const branchName = getCurrentBranch()
  console.log('branch:', branchName)

  // Get the latest release.
  const tags = getTags()
  const latestRelease = getLatestRelease(tags)

  if (latestRelease) {
    console.log(
      'found a previous release "%s" (%s)',
      latestRelease.tag,
      latestRelease.hash
    )
  } else {
    console.log('found no previous releases, creating a new one...')
  }

  const commits = await getCommits({
    after: latestRelease?.hash,
  })

  if (commits.length === 0) {
    console.log('no commits since the latest release, skipping...')
    return
  }

  console.log('found %d new commit(s):', commits.length)
  for (const commit of commits) {
    console.log(' - %s %s', commit.commit.short, commit.subject)
  }

  // Get the next release type and version number.
  const nextReleaseType = getNextReleaseType(commits)
  if (!nextReleaseType) {
    console.log('committed changes do not bump version, skipping...')
    return
  }

  console.log('release type: %s', nextReleaseType)

  const prevVersion = latestRelease?.tag || '0.0.0'
  const nextVersion = getNextVersion(prevVersion, nextReleaseType)
  console.log('next version: %s -> %s', prevVersion, nextVersion)

  /**
   * @todo
   * 1. Bump version in local package.json.
   * 2. Run the publishing script.
   * 3. If success, commit the package.json changes.
   * 4. Push the changes to the remote.
   */
  bumpPackageJson(nextVersion)

  // Execute the publishing script.
  const { error: publishError, data: publishStdout } = await until(() => {
    return execAsync(config.script)
  })

  if (publishError) {
    console.error('Failed to publish!', publishError)
    return
  }

  console.log(publishStdout)
  console.log('published successfully!')

  // Create a release commit containing the version bump in package.json
  await createCommit({
    files: ['package.json'],
    message: `chore: release ${nextVersion}`,
  })

  // Create a Git tag for the release.
  await createTag(nextVersion)
}
