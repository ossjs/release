import { until } from '@open-draft/until'
import { invariant } from 'outvariant'
import { Command } from '../Command'
import { getInfo, GitInfo } from '../utils/git/getInfo'
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
import { getReleaseNotes, toMarkdown } from '../utils/getReleaseNotes'
import { createRelease } from '../utils/git/createRelease'
import { push } from '../utils/git/push'

const { GITHUB_TOKEN } = process.env

export interface ReleaseContext {
  repo: GitInfo
  version: string
  prevVersion: string
  publishedAt: Date
}

export class Publish extends Command {
  static command = 'publish'
  static description = 'Publish the package'

  public run = async () => {
    invariant(
      GITHUB_TOKEN,
      'Failed to publish the package: the "GITHUB_TOKEN" environmental variable is not provided.'
    )

    // Extract repository information (remote/owner/name).
    const repo = await getInfo()

    const branchName = await getCurrentBranch()
    console.log('preparing release from "%s"...', branchName)

    /**
     * @todo Check that the repo state is without uncommitted changes.
     */

    // Get the latest release.
    const tags = await getTags()
    const latestRelease = await getLatestRelease(tags)

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

    const context: ReleaseContext = {
      repo,
      version: nextVersion,
      prevVersion,
      publishedAt: new Date(),
    }

    // Bump the version in package.json without committing it.
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

    console.log('\n')
    console.log(publishResult.data)
    console.log('published successfully!')

    const revertQueue: Array<() => Promise<void>> = []

    const result = await until(async () => {
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

      revertQueue.push(async () => {
        console.log('reverting the release commit...')
        await execAsync('git reset --hard HEAD~1')
      })

      console.log('created a release commit!')

      // Create a Git tag for the release.
      const tagResult = await until(() => createTag(nextVersion))

      invariant(
        tagResult.error == null,
        'Failed to tag the release!\n',
        tagResult.error
      )

      revertQueue.push(async () => {
        console.log('reverting release tag...')
        await execAsync(`git tag -d ${nextVersion}`)
      })

      console.log('created release tag "%s"!', tagResult.data)

      // Generate release notes and create a new release on GitHub.
      const releaseNotes = await getReleaseNotes(commits)
      const releaseMarkdown = toMarkdown(context, releaseNotes)
      console.log('generated release notes:\n\n', releaseMarkdown)

      const releaseUrl = await createRelease(context, releaseMarkdown)
      console.log('created release: %s', releaseUrl)

      // Push the release commit and tag to the origin.
      const pushResult = await until(() => push())
      invariant(
        pushResult.error == null,
        'Failed to push changes to origin!\n',
        pushResult.error
      )

      console.log('pushed changes to origin!')
    })

    if (result.error) {
      console.log('pushing release failed, reverting changes...')

      // Revert changes in case of errors.
      for (const revert of revertQueue) {
        await revert()
      }

      invariant(false, result.error.message)
    }

    console.log('release done!')
  }
}
