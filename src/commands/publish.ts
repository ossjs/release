import { until } from '@open-draft/until'
import { invariant, format } from 'outvariant'
import { BuilderCallback } from 'yargs'
import { Command } from '../Command'
import { createContext, ReleaseContext } from '../utils/createContext'
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
import { push } from '../utils/git/push'
import { getReleaseRefs } from '../utils/release-notes/getReleaseRefs'
import { parseCommits, ParsedCommitWithHash } from '../utils/git/parseCommits'
import { createComment } from '../utils/github/createComment'
import { createReleaseComment } from '../utils/createReleaseComment'
import { demandGitHubToken } from '../utils/env'
import { Notes } from './notes'

interface Argv {
  dryRun?: boolean
}

export type RevertAction = () => Promise<void>

export class Publish extends Command<Argv> {
  static command = 'publish'
  static description = 'Publish the package'
  static builder: BuilderCallback<{}, Argv> = (yargs) => {
    return yargs.usage('$0 publish [options]').option('dry-run', {
      alias: 'd',
      type: 'boolean',
      default: false,
      demandOption: false,
      description: 'Print command steps without executing them',
    })
  }

  private context: ReleaseContext = null as any

  /**
   * The list of clean-up functions to invoke if release fails.
   */
  private revertQueue: Array<RevertAction> = []

  public run = async (): Promise<void> => {
    await demandGitHubToken().catch((error) => {
      this.log.error(error.message)
      process.exit(1)
    })

    this.revertQueue = []

    // Extract repository information (remote/owner/name).
    const repo = await getInfo().catch((error) => {
      console.error(error)
      throw new Error('Failed to get Git repository information')
    })
    const branchName = await getCurrentBranch().catch((error) => {
      console.error(error)
      throw new Error('Failed to get the current branch name')
    })

    this.log.info(
      format(
        'preparing release for "%s/%s" from branch "%s"...',
        repo.owner,
        repo.name,
        branchName,
      ),
    )

    // Get the latest release.
    const tags = await getTags()
    const latestRelease = await getLatestRelease(tags)

    if (latestRelease) {
      this.log.info(
        format(
          'found latest release: %s (%s)',
          latestRelease.tag,
          latestRelease.hash,
        ),
      )
    } else {
      this.log.info('found no previous releases, creating the first one...')
    }

    const rawCommits = await getCommits({
      since: latestRelease?.hash,
    })

    this.log.info(
      format(
        'found %d new %s:\n%s',
        rawCommits.length,
        rawCommits.length > 1 ? 'commits' : 'commit',
        rawCommits
          .map((commit) => format('  - %s %s', commit.hash, commit.subject))
          .join('\n'),
      ),
    )

    const commits = await parseCommits(rawCommits)
    this.log.info(format('successfully parsed %d commit(s)!', commits.length))

    if (commits.length === 0) {
      this.log.warn('no commits since the latest release, skipping...')
      return
    }

    // Get the next release type and version number.
    const nextReleaseType = getNextReleaseType(commits)
    if (!nextReleaseType) {
      this.log.warn('committed changes do not bump version, skipping...')
      return
    }

    const prevVersion = latestRelease?.tag || 'v0.0.0'
    const nextVersion = getNextVersion(prevVersion, nextReleaseType)

    this.context = createContext({
      repo,
      latestRelease,
      nextRelease: {
        version: nextVersion,
        publishedAt: new Date(),
      },
    })

    this.log.info(
      format(
        'release type "%s": %s -> %s',
        nextReleaseType,
        prevVersion.replace(/^v/, ''),
        this.context.nextRelease.version,
      ),
    )

    // Bump the version in package.json without committing it.
    if (this.argv.dryRun) {
      this.log.warn(
        format(
          'skip version bump in package.json in dry-run mode (next: %s)',
          nextVersion,
        ),
      )
    } else {
      bumpPackageJson(nextVersion)
      this.log.info(
        format('bumped version in package.json to: %s', nextVersion),
      )
    }

    // Execute the publishing script.
    await this.runReleaseScript()

    const result = await until(async () => {
      await this.createReleaseCommit()
      await this.createReleaseTag()
      await this.pushToRemote()
      const releaseNotes = await this.generateReleaseNotes(commits)
      const releaseUrl = await this.createGitHubRelease(releaseNotes)

      return {
        releaseUrl,
      }
    })

    // Handle any errors during the release process the same way.
    if (result.error) {
      this.log.error(result.error.message)

      /**
       * @todo Suggest a standalone command to repeat the commit/tag/release
       * part of the publishing. The actual publish script was called anyway,
       * so the package has been published at this point, just the Git info
       * updates are missing.
       */
      this.log.error('release failed, reverting changes...')

      // Revert changes in case of errors.
      await this.revertChanges()

      return process.exit(1)
    }

    // Comment on each relevant GitHub issue.
    await this.commentOnIssues(commits, result.data.releaseUrl)

    if (this.argv.dryRun) {
      this.log.warn(
        format(
          'release "%s" completed in dry-run mode!',
          this.context.nextRelease.tag,
        ),
      )
      return
    }

    this.log.info(
      format('release "%s" completed!', this.context.nextRelease.tag),
    )
  }

  /**
   * Execute the release script specified in the configuration.
   */
  private async runReleaseScript(): Promise<void> {
    const env = {
      RELEASE_VERSION: this.context.nextRelease.version,
    }

    this.log.info(
      format('preparing to run the publishing script with:\n%j', env),
    )

    if (this.argv.dryRun) {
      this.log.warn('skip executing publishing script in dry-run mode')
      return
    }

    this.log.info('executing publishing script...')

    const publishResult = await until(async () => {
      const releaseScriptStd = await execAsync(this.config.script, {
        env: {
          ...process.env,
          ...env,
        },
      })

      this.log.info(`publishing script done, see the process output below:

${[
  ['--- stdout ---', releaseScriptStd.stdout],
  ['--- stderr ---', releaseScriptStd.stderr],
]
  .filter(([, data]) => !!data)
  .map(([header, data]) => `${header}\n${data}`)
  .join('\n\n')}
`)
    })

    invariant(
      publishResult.error == null,
      'Failed to publish: the publish script exited.\n%s',
      publishResult.error?.message,
    )

    this.log.info('published successfully!')
  }

  /**
   * Revert those changes that were marked as revertable.
   */
  private async revertChanges(): Promise<void> {
    let revert: RevertAction | undefined

    while ((revert = this.revertQueue.pop())) {
      await revert()
    }
  }

  /**
   * Create a release commit in Git.
   */
  private async createReleaseCommit(): Promise<void> {
    const message = `chore(release): ${this.context.nextRelease.tag}`

    if (this.argv.dryRun) {
      this.log.warn(
        format('skip creating a release commit in dry-run mode: "%s"', message),
      )
      return
    }

    const commitResult = await until(() => {
      return commit({
        files: ['package.json'],
        message,
      })
    })

    invariant(
      commitResult.error == null,
      'Failed to create release commit!\n',
      commitResult.error,
    )

    this.log.info(
      format('created a release commit at "%s"!', commitResult.data.hash),
    )

    this.revertQueue.push(async () => {
      this.log.info('reverting the release commit...')

      const hasChanges = await execAsync('git diff')

      if (hasChanges) {
        this.log.info('detected uncommitted changes, stashing...')
        await execAsync('git stash')
      }

      await execAsync('git reset --hard HEAD~1').finally(async () => {
        if (hasChanges) {
          this.log.info('unstashing uncommitted changes...')
          await execAsync('git stash pop')
        }
      })
    })
  }

  /**
   * Create a release tag in Git.
   */
  private async createReleaseTag(): Promise<void> {
    const nextTag = this.context.nextRelease.tag

    if (this.argv.dryRun) {
      this.log.warn(
        format('skip creating a release tag in dry-run mode: %s', nextTag),
      )
      return
    }

    const tagResult = await until(async () => {
      const tag = await createTag(nextTag)
      await execAsync(`git push origin ${tag}`)
      return tag
    })

    invariant(
      tagResult.error == null,
      'Failed to tag the release!\n',
      tagResult.error,
    )

    this.revertQueue.push(async () => {
      const tagToRevert = this.context.nextRelease.tag
      this.log.info(format('reverting the release tag "%s"...', tagToRevert))

      await execAsync(`git tag -d ${tagToRevert}`)
      await execAsync(`git push --delete origin ${tagToRevert}`)
    })

    this.log.info(format('created release tag "%s"!', tagResult.data))
  }

  /**
   * Generate release notes from the given commits.
   */
  private async generateReleaseNotes(
    commits: ParsedCommitWithHash[],
  ): Promise<string> {
    const releaseNotes = await Notes.generateReleaseNotes(this.context, commits)
    this.log.info(`generated release notes:\n\n${releaseNotes}\n`)

    return releaseNotes
  }

  /**
   * Push the release commit and tag to the remote.
   */
  private async pushToRemote(): Promise<void> {
    if (this.argv.dryRun) {
      this.log.warn('skip pushing release to Git in dry-run mode')
      return
    }

    const pushResult = await until(() => push())

    invariant(
      pushResult.error == null,
      'Failed to push changes to origin!\n',
      pushResult.error,
    )

    this.log.info(
      format('pushed changes to "%s" (origin)!', this.context.repo.remote),
    )
  }

  /**
   * Create a new GitHub release.
   */
  private async createGitHubRelease(releaseNotes: string): Promise<string> {
    if (this.argv.dryRun) {
      this.log.warn('skip creating a GitHub release in dry-run mode')
      return '#'
    }

    const release = await Notes.createRelease(this.context, releaseNotes)
    const { html_url: releaseUrl } = release
    this.log.info(format('created release: %s', releaseUrl))

    return releaseUrl
  }

  /**
   * Comment on referenced GitHub issues and pull requests.
   */
  private async commentOnIssues(
    commits: ParsedCommitWithHash[],
    releaseUrl: string,
  ): Promise<void> {
    const issueIds = await getReleaseRefs(commits)
    const releaseCommentText = createReleaseComment({
      context: this.context,
      releaseUrl,
    })

    if (issueIds.size > 0) {
      const issuesCount = issueIds.size
      const issuesNoun = issuesCount === 1 ? 'issue' : 'issues'
      const issuesDisplayList = Array.from(issueIds)
        .map((id) => `  - ${id}`)
        .join('\n')

      if (this.argv.dryRun) {
        this.log.warn(
          format(
            'skip commenting on %d GitHub %s:\n%s',
            issueIds.size,
            issuesNoun,
            issuesDisplayList,
          ),
        )
        return
      }

      this.log.info(
        format(
          'commenting on %d GitHub %s:\n%s',
          issuesCount,
          issuesNoun,
          issuesDisplayList,
        ),
      )

      const commentPromises: Promise<void>[] = []
      for (const issueId of issueIds) {
        commentPromises.push(
          createComment(issueId, releaseCommentText).catch((error) => {
            this.log.error(
              format('commenting on issue "%s" failed: %s', error.message),
            )
          }),
        )
      }

      await Promise.allSettled(commentPromises)
    } else {
      this.log.info('no referenced GitHub issues, nothing to comment!')
    }
  }
}
