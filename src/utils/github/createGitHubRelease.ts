import fetch from 'node-fetch'
import { format } from 'outvariant'
import type { ReleaseContext } from '../createContext'
import type { GitHubRelease } from './getGitHubRelease'
import { log } from '../../logger'

/**
 * Create a new GitHub release with the given release notes.
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
