import type { BuilderCallback } from 'yargs'
import { format, invariant } from 'outvariant'
import fetch from 'node-fetch'
import { Command } from '../Command'
import { getTag, TagPointer } from '../utils/git/getTag'
import { getLatestRelease } from '../utils/git/getLatestRelease'
import { getTags } from '../utils/git/getTags'
import { getCommit } from '../utils/git/getCommit'
import { getInfo } from '../utils/git/getInfo'
import { execAsync } from '../utils/execAsync'
import { demandGitHubToken } from '../utils/env'

interface Argv {
  tag?: string
}

export enum ReleaseStatus {
  /**
   * Release is public and available for everybody to see
   * on the GitHub releases page.
   */
  Public = 'public',
  /**
   * Release is pushed to GitHub but is marked as draft.
   */
  Draft = 'draft',
  /**
   * Release is local, not present on GitHub.
   */
  Unpublished = 'unpublished',
}

export class Show extends Command<Argv> {
  static command = 'show'
  static description = 'Show release info'
  static builder: BuilderCallback<{}, Argv> = (yargs) => {
    return yargs
      .usage('$0 show [tag]')
      .example([
        ['$0 show', 'Show the latest release info'],
        ['$0 show 1.2.3', 'Show specific release tag info'],
      ])
      .positional('tag', {
        type: 'string',
        description: 'Release tag',
        demandOption: false,
      })
  }

  public run = async () => {
    await demandGitHubToken().catch((error) => {
      this.log.error(error.message)
      process.exit(1)
    })

    const [, tag] = this.argv._

    const pointer = await this.getTagPointer(tag?.toString())
    this.log.info(format('found tag "%s"!', pointer.tag))

    const commit = await getCommit(pointer.hash)

    invariant(
      commit,
      'Failed to retrieve release info for tag "%s": cannot find commit associated with the tag.',
      tag,
    )

    // Print local Git info about the release commit.
    const commitOut = await execAsync(`git log -1 ${commit.commit.long}`)
    this.log.info(commitOut)

    // Print the remote GitHub info about the release.
    const repo = await getInfo()

    const releaseResponse = await fetch(
      `https://api.github.com/repos/${repo.owner}/${repo.name}/releases/tags/${pointer.tag}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      },
    )

    const isPublishedRelease = releaseResponse.status === 200
    const release = await releaseResponse.json()

    const releaseStatus: ReleaseStatus = isPublishedRelease
      ? release.draft
        ? ReleaseStatus.Draft
        : ReleaseStatus.Public
      : ReleaseStatus.Unpublished

    this.log.info(format('release status: %s', releaseStatus))

    if (
      releaseStatus === ReleaseStatus.Public ||
      releaseStatus === ReleaseStatus.Draft
    ) {
      this.log.info(format('release url: %s', release?.html_url))
    }

    if (!isPublishedRelease) {
      this.log.warn(
        format('release "%s" is not published to GitHub!', pointer.tag),
      )
    }
  }

  /**
   * Returns tag pointer by the given tag name.
   * If no tag name was given, looks up the latest release tag
   * and returns its pointer.
   */
  private async getTagPointer(tag?: string): Promise<TagPointer> {
    if (tag) {
      this.log.info(format('looking up explicit "%s" tag...', tag))
      const pointer = await getTag(tag)

      invariant(
        pointer,
        'Failed to retrieve release tag: tag "%s" does not exist.',
        tag,
      )

      return pointer
    }

    this.log.info('looking up the latest release tag...')
    const tags = await getTags()

    invariant(
      tags.length > 0,
      'Failed to retrieve release tag: repository has no releases.',
    )

    const latestPointer = await getLatestRelease(tags)

    invariant(
      latestPointer,
      'Failed to retrieve release tag: cannot retrieve releases.',
    )

    return latestPointer
  }
}
