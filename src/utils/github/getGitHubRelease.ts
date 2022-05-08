import { invariant } from 'outvariant'
import fetch from 'node-fetch'
import { getInfo } from '../git/getInfo'

export interface GitHubRelease {
  html_url: string
}

export async function getGitHubRelease(
  tag: string,
): Promise<GitHubRelease | undefined> {
  const repo = await getInfo()

  const response = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/releases/tags/${tag}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    },
  )

  if (response.status === 404) {
    return undefined
  }

  invariant(
    response.ok,
    'Failed to fetch GitHub release for tag "%s": server responded with %d.\n\n%s',
    tag,
    response.status,
  )

  return response.json()
}
