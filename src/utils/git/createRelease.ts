import fetch from 'node-fetch'
import { format } from 'outvariant'
import type { ReleaseContext } from '../../commands/publish'

export interface CreateReleaseResponse {
  url: string
}

/**
 * Create a new GitHub release with the given release notes.
 * @return {string} The URL of the newly created release.
 */
export async function createRelease(
  context: ReleaseContext,
  notes: string
): Promise<string> {
  const { repo } = context

  console.log(
    'creating a new release at "%s/%s"...',
    context.repo.owner,
    context.repo.name
  )

  const response = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/releases`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag_name: context.version,
        name: context.version,
        body: notes,
      }),
    }
  )

  if (response.status === 401) {
    throw new Error(
      'Failed to create a new GitHub release: provided GITHUB_TOKEN does not have sufficient permissions to perform this operation. Please check your token and update it if necessary.'
    )
  }

  if (response.status !== 201) {
    throw new Error(
      format(
        'Failed to create a new GitHub release: GitHub API responded with status code %d.',
        response.status
      )
    )
  }

  const data = (await response.json()) as CreateReleaseResponse

  return data.url
}
