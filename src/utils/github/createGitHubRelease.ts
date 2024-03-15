import fetch from 'node-fetch'
import { format } from 'outvariant'
import { lt } from 'semver'
import type { ReleaseContext } from '../createContext'
import { getGitHubRelease, type GitHubRelease } from './getGitHubRelease'
import { log } from '../../logger'

/**
 * Create a new GitHub release with the given release notes.
 * This is only called if there's no existing GitHub release
 * for the next release tag.
 * @return {string} The URL of the newly created release.
 */
export async function createGitHubRelease(
  context: ReleaseContext,
  notes: string,
): Promise<GitHubRelease> {
  const { repo } = context

  log.info(
    format(
      'creating a new GitHub release at "%s/%s"...',
      repo.owner,
      repo.name,
    ),
  )

  // Determine if the next release should be marked as the
  // latest release on GitHub. For that, fetch whichever latest
  // release exists on GitHub and see if its version is larger
  // than the version we are releasing right now.
  const latestGitHubRelease = await getGitHubRelease('latest').catch(
    (error) => {
      log.error(`Failed to fetch the latest GitHub release:`, error)
      // We aren't interested in the GET endpoint errors in this context.
      return undefined
    },
  )
  const shouldMarkAsLatest = latestGitHubRelease
    ? lt(latestGitHubRelease.tag_name || '0.0.0', context.nextRelease.tag)
    : // Undefined is fine, it means GitHub will use its default
      // value for the "make_latest" property in the API.
      undefined

  /**
   * @see https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#create-a-release
   */
  const response = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/releases`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag_name: context.nextRelease.tag,
        name: context.nextRelease.tag,
        body: notes,
        make_latest: shouldMarkAsLatest?.toString(),
      }),
    },
  )

  if (response.status === 401) {
    throw new Error(
      'Failed to create a new GitHub release: provided GITHUB_TOKEN does not have sufficient permissions to perform this operation. Please check your token and update it if necessary.',
    )
  }

  if (response.status !== 201) {
    throw new Error(
      format(
        'Failed to create a new GitHub release: GitHub API responded with status code %d.',
        response.status,
        await response.text(),
      ),
    )
  }

  return response.json()
}
