import { format, invariant } from 'outvariant'
import type { BuilderCallback } from 'yargs'
import type { ReleaseContext } from '../utils/createContext.js'
import { demandGitHubToken } from '../utils/env.js'
import { createGitHubRelease } from '../utils/github/createGitHubRelease.js'
import { Command } from '../Command.js'
import { getInfo } from '../utils/git/getInfo.js'
import {
  parseCommits,
  type ParsedCommitWithHash,
} from '../utils/git/parseCommits.js'
import { getReleaseNotes } from '../utils/release-notes/getReleaseNotes.js'
import { toMarkdown } from '../utils/release-notes/toMarkdown.js'
import { getCommits } from '../utils/git/getCommits.js'
import { getTag } from '../utils/git/getTag.js'
import { getCommit } from '../utils/git/getCommit.js'
import { byReleaseVersion } from '../utils/git/getLatestRelease.js'
import { getTags } from '../utils/git/getTags.js'
import {
  getGitHubRelease,
  type GitHubRelease,
} from '../utils/github/getGitHubRelease.js'

interface Argv {
  _: [path: string, tag: string]
}

export class Notes extends Command<Argv> {
  static command = 'notes'
  static description =
    'Generate GitHub release notes for the given release version.'

  static builder: BuilderCallback<{}, Argv> = (yargs) => {
    return yargs.usage('$ notes [tag]').positional('tag', {
      type: 'string',
      desciption: 'Release tag',
      demandOption: true,
    })
  }

  public run = async () => {
    await demandGitHubToken().catch((error) => {
      this.log.error(error.message)
      process.exit(1)
    })

    const repo = await getInfo()

    const [, tagInput] = this.argv._
    const tagName = tagInput.startsWith('v') ? tagInput : `v${tagInput}`
    const version = tagInput.replace(/^v/, '')

    // Check if there's an existing GitHub release for the given tag.
    const existingRelease = await getGitHubRelease(tagName)

    if (existingRelease) {
      this.log.warn(
        format(
          'found existing GitHub release for "%s": %s',
          tagName,
          existingRelease.html_url,
        ),
      )
      return process.exit(1)
    }

    this.log.info(
      format(
        'creating GitHub release for version "%s" in "%s/%s"...',
        tagName,
        repo.owner,
        repo.name,
      ),
    )

    // Retrieve the information about the given release version.
    const tagPointer = await getTag(tagName)
    invariant(
      tagPointer,
      'Failed to create GitHub release: unknown tag "%s". Please make sure you are providing an existing release tag.',
      tagName,
    )

    this.log.info(
      format('found release tag "%s" (%s)', tagPointer.tag, tagPointer.hash),
    )

    const releaseCommit = await getCommit(tagPointer.hash)
    invariant(
      releaseCommit,
      'Failed to create GitHub release: unable to retrieve the commit by tag "%s" (%s).',
      tagPointer.tag,
      tagPointer.hash,
    )

    // Retrieve the pointer to the previous release.
    const tags = await getTags().then((tags) => {
      return tags.sort(byReleaseVersion)
    })

    const tagReleaseIndex = tags.indexOf(tagPointer.tag)
    const previousReleaseTag = tags[tagReleaseIndex + 1]

    const previousRelease = previousReleaseTag
      ? await getTag(previousReleaseTag)
      : undefined

    if (previousRelease?.hash) {
      this.log.info(
        format(
          'found preceding release "%s" (%s)',
          previousRelease.tag,
          previousRelease.hash,
        ),
      )
    } else {
      this.log.info(
        format(
          'found no released preceding "%s": analyzing all commits until "%s"...',
          tagPointer.tag,
          tagPointer.hash,
        ),
      )
    }

    // Get commits list between the given release and the previous release.
    const commits = await getCommits({
      since: previousRelease?.hash,
      until: tagPointer.hash,
    }).then(parseCommits)

    const context: ReleaseContext = {
      repo,
      nextRelease: {
        version,
        tag: tagPointer.tag,
        publishedAt: releaseCommit.author.date,
      },
      latestRelease: previousRelease,
    }

    // Generate release notes for the commits.
    const releaseNotes = await Notes.generateReleaseNotes(context, commits)
    this.log.info(format('generated release notes:\n%s', releaseNotes))

    // Create GitHub release.
    const release = await Notes.createRelease(context, releaseNotes)
    this.log.info(format('created GitHub release: %s', release.html_url))
  }

  static async generateReleaseNotes(
    context: ReleaseContext,
    commits: ParsedCommitWithHash[],
  ): Promise<string> {
    const releaseNotes = await getReleaseNotes(commits)
    const markdown = toMarkdown(context, releaseNotes)
    return markdown
  }

  static async createRelease(
    context: ReleaseContext,
    notes: string,
  ): Promise<GitHubRelease> {
    return createGitHubRelease(context, notes)
  }
}
