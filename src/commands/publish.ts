import { until } from '@open-draft/until'
import { Command } from '../Command'
import { getNextReleaseType } from '../utils/getNextReleaseType'
import { getNextVersion } from '../utils/getNextVersion'
import { getCommits } from '../utils/git/getCommits'
import { getCurrentBranch } from '../utils/git/getCurrentBranch'
import { getLatestRelease } from '../utils/git/getLatestRelease'
import { bumpPackageJson } from '../utils/bumpPackageJson'
import { getTags } from '../utils/git/getTags'
import { execAsync } from '../utils/execAsync'
import { createCommit } from '../utils/git/createCommit'
import { createTag } from '../utils/git/createTag'
import { push } from '../utils/git/push'
import { invariant } from 'outvariant'

export class Publish extends Command {
  static command = 'publish'
  static description = 'Publish the package'

  public run = async () => {
    const branchName = getCurrentBranch()
    console.log('preparing release from "%s"...', branchName)

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
    console.log('executing the publishing script...')
    const publishResult = await until(() => {
      return execAsync(this.config.script, {
        env: {
          RELEASE_VERSION: nextVersion,
        },
      })
    })

    invariant(
      publishResult.error == null,
      'Failed to publish: the publish script exited.\n',
      publishResult.error
    )

    console.log('\n', publishResult.data)
    console.log('published successfully!')

    // Create a release commit containing the version bump in package.json
    const commitResult = await until(() => {
      return createCommit({
        files: ['package.json'],
        message: `chore: release ${nextVersion}`,
      })
    })
    invariant(
      commitResult.error == null,
      'Failed to create release commit!\n',
      commitResult.error
    )

    console.log('created a release commit!')

    // Create a Git tag for the release.
    const tagResult = await until(() => createTag(nextVersion))
    invariant(
      tagResult.error == null,
      'Failed to tag the release!\n',
      tagResult.error
    )

    console.log('created release tag "%s"!', tagResult.data)

    // Push the release commit and tag to the origin.
    const pushResult = await until(() => push())
    invariant(
      pushResult.error == null,
      'Failed to push changes to origin!\n',
      pushResult.error
    )

    console.log('pushed changes to origin!')
  }
}
