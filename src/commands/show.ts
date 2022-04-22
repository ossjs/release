import type { BuilderCallback } from 'yargs'
import { log } from '../logger'
import { Command } from '../Command'
import { getTag, TagPointer } from '../utils/git/getTag'
import { getLatestRelease } from '../utils/git/getLatestRelease'
import { getTags } from '../utils/git/getTags'
import { getCommit } from '../utils/git/getCommit'
import { getInfo } from '../utils/git/getInfo'
import { execAsync } from '../utils/execAsync'
import fetch from 'node-fetch'

interface Argv {
  _: string[]
  tag?: string
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

  public run = async (argv: Argv) => {
    const [, tag] = argv._

    const pointer = await this.getTagPointer(tag)
    log.info('found tag "%s"!', pointer.tag)

    /**
     * @todo Display release info:
     * - Commit hash and message.
     * - GitHub releases link (verify if exists).
     */
    const commit = await getCommit(pointer.hash)

    if (!commit) {
      return
    }

    // Print local Git info about the release commit.
    const commitOut = await execAsync(`git log -1 ${commit.commit.long}`)
    log.info(commitOut)

    // Print the remote GitHub info about the release.
    const repo = await getInfo()
    const gitHubCommitUrl = new URL(`commit/${commit.commit.long}`, repo.url)

    const releaseResponse = await fetch(
      `https://api.github.com/repos/${repo.owner}/${repo.name}/releases/tags/${pointer.tag}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    )

    const isPublishedRelease = releaseResponse.status === 200
    const releaseState = isPublishedRelease ? 'published' : 'unpublished'
    const release = await releaseResponse.json()

    log.info(
      `release on GitHub:
  - Commit: %s
  - Release: %s %s`,
      gitHubCommitUrl.href,
      releaseState,
      release?.html_url || ''
    )

    if (!isPublishedRelease) {
      log.warn('release "%s" is not published to GitHub!', pointer.tag)
    }
  }

  /**
   * Returns tag pointer by the given tag name.
   * If no tag name was given, looks up the latest release tag
   * and returns its pointer.
   */
  private async getTagPointer(tag?: string): Promise<TagPointer> {
    if (tag) {
      log.info('looking up explicit "%s" tag...', tag)
      const pointer = await getTag(tag)

      if (!pointer) {
        log.error('tag "%s" does not exist!', tag)
        return process.exit(1)
      }

      return pointer
    }

    log.info('looking up the latest release tag...')
    const tags = await getTags()

    if (tags.length === 0) {
      log.warn('repository has no releases!')
      return process.exit(1)
    }

    const latestPointer = await getLatestRelease(tags)

    if (!latestPointer) {
      log.warn('found no releases to show!')
      return process.exit(1)
    }

    return latestPointer
  }
}
