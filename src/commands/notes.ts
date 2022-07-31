import { format, invariant } from 'outvariant'
import type { BuilderCallback } from 'yargs'
import type { ReleaseContext } from '../utils/createContext'
import { demandGitHubToken } from '../utils/env'
import { createGitHubRelease } from '../utils/github/createGitHubRelease'
import { Command } from '../Command'
import { getInfo } from '../utils/git/getInfo'
import { parseCommits, ParsedCommitWithHash } from '../utils/git/parseCommits'
import { getReleaseNotes } from '../utils/release-notes/getReleaseNotes'
import { toMarkdown } from '../utils/release-notes/toMarkdown'
import { getCommits } from '../utils/git/getCommits'
import { getTag } from '../utils/git/getTag'
import { getCommit } from '../utils/git/getCommit'
import { byReleaseVersion } from '../utils/git/getLatestRelease'
import { getTags } from '../utils/git/getTags'
import {
  getGitHubRelease,
  GitHubRelease,
} from '../utils/github/getGitHubRelease'

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
