import fetch from 'node-fetch'
import { invariant } from 'outvariant'

export const requiredGitHubTokenScopes: string[] = [
  'repo',
  'admin:repo_hook',
  'admin:org_hook',
]

export const GITHUB_NEW_TOKEN_URL = `https://github.com/settings/tokens/new?scopes=${requiredGitHubTokenScopes.join(
  ',',
)}`

/**
 * Check whether the given GitHub access token has sufficient permissions
 * for this library to create and publish a new release.
 */
export async function validateAccessToken(accessToken: string): Promise<void> {
  const response = await fetch('https://api.github.com', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const permissions =
    response.headers
      .get('x-oauth-scopes')
      ?.split(',')
      .map((scope) => scope.trim()) || []

  // Handle generic error responses.
  invariant(
    response.ok,
    'Failed to verify GitHub token permissions: GitHub API responded with %d %s. Please double-check your "GITHUB_TOKEN" environmental variable and try again.',
    response.status,
    response.statusText,
  )

  invariant(
    permissions.length > 0,
    'Failed to verify GitHub token permissions: GitHub API responded with an empty "X-OAuth-Scopes" header.',
  )

  for (const scope of requiredGitHubTokenScopes) {
    invariant(
      permissions.includes(scope),
      'Provided "GITHUB_TOKEN" has insufficient permissions: missing the "%s" scope. Please generate a new GitHub personal access token from this URL: %s',
      scope,
      GITHUB_NEW_TOKEN_URL,
    )
  }
}
