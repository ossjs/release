import fetch from 'node-fetch'
import { invariant } from 'outvariant'
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
    console.error(
      'Failed to create a new GitHub release: provided GITHUB_TOKEN does not have sufficient permissions to perform this operation. Please check your token and update it if necessary.'
    )
    process.exit(1)
  }

  if (response.status !== 201) {
    console.error(
      'Failed to create a new GitHub release: GitHub API responded with status code %d.',
      response.status
    )
    process.exit(1)
  }

  const data = (await response.json()) as CreateReleaseResponse

  return data.url
}
