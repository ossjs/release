import { until } from '@open-draft/until'
import { invariant } from 'outvariant'
import { Command } from '../Command'
import { log } from '../logger'
import { createContext } from '../utils/createContext'
import { getInfo } from '../utils/git/getInfo'
import { getNextReleaseType } from '../utils/getNextReleaseType'
import { getNextVersion } from '../utils/getNextVersion'
import { getCommits } from '../utils/git/getCommits'
import { getCurrentBranch } from '../utils/git/getCurrentBranch'
import { getLatestRelease } from '../utils/git/getLatestRelease'
import { bumpPackageJson } from '../utils/bumpPackageJson'
import { getTags } from '../utils/git/getTags'
import { execAsync } from '../utils/execAsync'
import { commit } from '../utils/git/commit'
import { createTag } from '../utils/git/createTag'
import { getReleaseNotes, toMarkdown } from '../utils/getReleaseNotes'
import { createRelease } from '../utils/git/createRelease'
import { push } from '../utils/git/push'
import { getReleaseRefs } from '../utils/getReleaseRefs'
import { parseCommits } from '../utils/git/parseCommits'
import { createComment } from '../utils/github/createComment'

export class Publish extends Command {
  static command = 'publish'
  static description = 'Publish the package'

  public run = async () => {
    // Extract repository information (remote/owner/name).
    const repo = await getInfo()
    const branchName = await getCurrentBranch()

    log.info(
      'preparing release for "%s/%s" from "%s"...',
      repo.owner,
      repo.name,
      branchName
    )

    // Get the latest release.
    const tags = await getTags()
    const latestRelease = await getLatestRelease(tags)

    if (latestRelease) {
      log.info(
        'found latest release: %s (%s)',
        latestRelease.tag,
        latestRelease.hash
      )
    } else {
      log.info('found no previous releases, creating a new one...')
    }

    const commits = await getCommits({
      after: latestRelease?.hash,
    }).then(parseCommits)

    if (commits.length === 0) {
      log.warn('no commits since the latest release, skipping...')
      return
    }

    log.info('found %d new commit(s):', commits.length)
    for (const commit of commits) {
      log.info('- %s (%s)', commit.header, commit.hash)
    }

    // Get the next release type and version number.
    const nextReleaseType = getNextReleaseType(commits)
    if (!nextReleaseType) {
      log.warn('committed changes do not bump version, skipping...')
      return
    }

    log.info('next release type: %s', nextReleaseType)

    const prevVersion = latestRelease?.tag || '0.0.0'
    const nextVersion = getNextVersion(prevVersion, nextReleaseType)
    log.info('next version: %s -> %s', prevVersion, nextVersion)

    const context = createContext({
      repo,
      latestRelease,
      nextRelease: {
        version: nextVersion,
        publishedAt: new Date(),
      },
    })

    // Bump the version in package.json without committing it.
    bumpPackageJson(nextVersion)

    // Execute the publishing script.
    log.info('executing publishing script...')
    const publishResult = await until(() => {
      return execAsync(this.config.script, {
        env: {
          RELEASE_VERSION: nextVersion,
        },
      })
    })

    console.log(this.config.script, { publishResult })

    invariant(
      publishResult.error == null,
      'Failed to publish: the publish script exited.\n',
      publishResult.error
    )

    log.info(publishResult.data)
    log.info('published successfully!')

    // The queue of actions to invoke if releasing fails.
    const revertQueue: Array<() => Promise<void>> = []

    const result = await until(async () => {
      // Create a release commit containing the version bump in package.json
      const commitResult = await until(() => {
        return commit({
          files: ['package.json'],
          message: `chore: publish ${context.nextRelease.tag}`,
        })
      })

      invariant(
        commitResult.error == null,
        'Failed to create release commit!\n',
        commitResult.error
      )

      revertQueue.push(async () => {
        log.info('reverting the release commit...')

        const hasChanges = await execAsync('git diff')

        if (hasChanges) {
          log.info('stashing uncommitted changes...')
          await execAsync('git stash')
        }

        await execAsync('git reset --hard HEAD~1').finally(async () => {
          if (hasChanges) {
            log.info('unstashing uncommitted changes...')
            await execAsync('git stash pop')
          }
        })
      })

      log.info('created release commit!')

      // Create a Git tag for the release.
      const tagResult = await until(async () => {
        const tag = await createTag(context.nextRelease.tag)
        await execAsync('git push --tags')
        return tag
      })

      invariant(
        tagResult.error == null,
        'Failed to tag the release!\n',
        tagResult.error
      )

      revertQueue.push(async () => {
        log.info('reverting the release tag...')
        await execAsync(`git tag -d ${context.nextRelease.tag}`)
        await execAsync(`git push --delete origin ${context.nextRelease.tag}`)
      })

      log.info('created release tag "%s"!', tagResult.data)

      // Generate release notes and create a new release on GitHub.
      const releaseNotes = await getReleaseNotes(commits)
      const releaseMarkdown = toMarkdown(context, releaseNotes)
      log.info('generated release notes:\n\n', releaseMarkdown)

      const releaseUrl = await createRelease(context, releaseMarkdown)
      log.info('created release: %s', releaseUrl)

      // Push the release commit and tag to the origin.
      const pushResult = await until(() => push())
      invariant(
        pushResult.error == null,
        'Failed to push changes to origin!\n',
        pushResult.error
      )

      log.info('pushed changes to "%s" (origin)!', repo.remote)
    })

    if (result.error) {
      /**
       * @todo Suggest a standalone command to repeat the commit/tag/release
       * part of the publishing. The actual publish script was called anyway,
       * so the package has been published at this point, just the Git info
       * updates are missing.
       */
      log.warn('pushing release failed, reverting changes...')

      // Revert changes in case of errors.
      for (const revert of revertQueue) {
        await revert()
      }

      log.error(result.error)
      console.error(result.error)
      process.exit(1)
    }

    // Comment on each relevant GitHub issue.
    const issueIds = await getReleaseRefs(commits)
    const releaseCommentText = `\
## Release notes

This has been released in ${context.nextRelease.tag}!
`

    if (issueIds.size > 0) {
      log.info('commenting on %d referenced issue(s)...', issueIds.size)

      const commentPromises = []
      for (const issueId of issueIds) {
        commentPromises.push(
          createComment(issueId, releaseCommentText).catch((error) => {
            log.error('commenting on issue "%s" failed: %s', error.message)
          })
        )
      }

      await Promise.allSettled(commentPromises)
    } else {
      log.info('no referenced issues, nothing to comment')
    }

    log.info('release "%s" completed!', context.nextRelease.tag)
  }
}
