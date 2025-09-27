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

  const missingScopes = requiredGitHubTokenScopes.filter((scope) => {
    return !permissions.includes(scope)
  })

  if (missingScopes.length > 0) {
    invariant(
      false,
      'Provided "GITHUB_TOKEN" environment variable has insufficient permissions: missing scopes "%s". Please generate a new GitHub personal access token from this URL: %s',
      missingScopes.join(`", "`),
      GITHUB_NEW_TOKEN_URL,
    )
  }
}
