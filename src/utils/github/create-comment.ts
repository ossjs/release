import fetch from 'node-fetch'
import { invariant } from 'outvariant'
import { getInfo } from '#/src/utils/git/get-info.js'

export async function createComment(
  issueId: string,
  body: string,
): Promise<void> {
  const repo = await getInfo()

  const response = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/issues/${issueId}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body,
      }),
    },
  )

  invariant(
    response.ok,
    'Failed to create GitHub comment for "%s" issue.',
    issueId,
  )
}
