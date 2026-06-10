import { invariant } from 'outvariant'
import { getInfo, type GitInfo } from '#/src/utils/git/get-info.js'

export type GitHubTokenType = 'classic' | 'fine-grained'

export type GitHubRepo = Pick<GitInfo, 'owner' | 'name'>

const FINE_GRAINED_TOKEN_PREFIX = 'github_pat_'

export function getGitHubTokenType(accessToken: string): GitHubTokenType {
  if (accessToken.startsWith(FINE_GRAINED_TOKEN_PREFIX)) {
    return 'fine-grained'
  }

  return 'classic'
}

export const requiredGitHubTokenScopes: Array<string> = [
  'repo',
  'admin:repo_hook',
  'admin:org_hook',
]

export const GITHUB_NEW_TOKEN_URL = `https://github.com/settings/tokens/new?scopes=${requiredGitHubTokenScopes.join(
  ',',
)}`

export interface FineGrainedTokenPermission {
  permission: string
  access: 'read' | 'write'
  /**
   * Check whether the given access token is granted this permission.
   */
  probe: (accessToken: string, repo: GitHubRepo) => Promise<boolean>
}

export const requiredFineGrainedTokenPermissions: Array<FineGrainedTokenPermission> =
  [
    {
      permission: 'contents',
      access: 'write',
      async probe(accessToken, repo) {
        /**
         * Attempt to create a release without any payload.
         * GitHub checks the token permissions before validating
         * the payload: a validation error (422) means the token can
         * create releases while 403/404 mean the permission is missing.
         */
        const response = await fetch(
          `https://api.github.com/repos/${repo.owner}/${repo.name}/releases`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({}),
          },
        )

        return response.status === 422
      },
    },
    {
      permission: 'issues',
      access: 'write',
      async probe(accessToken, repo) {
        /**
         * Attempt to comment on an issue that can never exist (#0).
         * A 404/422 response means the token has passed the permission
         * check while 403 means the permission is missing.
         */
        const response = await fetch(
          `https://api.github.com/repos/${repo.owner}/${repo.name}/issues/0/comments`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({}),
          },
        )

        return response.status === 404 || response.status === 422
      },
    },
  ]

export const GITHUB_NEW_FINE_GRAINED_TOKEN_URL = `https://github.com/settings/personal-access-tokens/new?${requiredFineGrainedTokenPermissions
  .map((requiredPermission) => {
    return `${requiredPermission.permission}=${requiredPermission.access}`
  })
  .join('&')}`

/**
 * Check whether the given GitHub access token has sufficient permissions
 * for this library to create and publish a new release.
 */
export async function validateAccessToken(accessToken: string): Promise<void> {
  if (getGitHubTokenType(accessToken) === 'fine-grained') {
    const repo = await getInfo()
    await validateFineGrainedAccessToken(accessToken, repo)
    return
  }

  await validateClassicAccessToken(accessToken)
}

/**
 * Check whether the given classic GitHub access token (OAuth)
 * has sufficient permission scopes.
 */
export async function validateClassicAccessToken(
  accessToken: string,
): Promise<void> {
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

/**
 * Check whether the given fine-grained GitHub access token has
 * sufficient permissions for the given repository.
 */
export async function validateFineGrainedAccessToken(
  accessToken: string,
  repo: GitHubRepo,
): Promise<void> {
  const repoResponse = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  invariant(
    repoResponse.status !== 404,
    'Failed to verify GitHub token permissions: the provided fine-grained "GITHUB_TOKEN" cannot access the "%s/%s" repository. Please make sure that the repository access of the token includes that repository and try again.',
    repo.owner,
    repo.name,
  )

  // Handle generic error responses.
  invariant(
    repoResponse.ok,
    'Failed to verify GitHub token permissions: GitHub API responded with %d %s. Please double-check your "GITHUB_TOKEN" environmental variable and try again.',
    repoResponse.status,
    repoResponse.statusText,
  )

  /**
   * @note GitHub provides no API to list the permissions granted
   * to a fine-grained token so probe the endpoints behind the
   * required permissions instead.
   */
  const probedPermissions = await Promise.all(
    requiredFineGrainedTokenPermissions.map(async (requiredPermission) => {
      const isGranted = await requiredPermission.probe(accessToken, repo)

      return {
        requiredPermission,
        isGranted,
      }
    }),
  )

  const missingPermissions = probedPermissions
    .filter((probedPermission) => {
      return !probedPermission.isGranted
    })
    .map((probedPermission) => {
      return `${probedPermission.requiredPermission.permission}: ${probedPermission.requiredPermission.access}`
    })

  if (missingPermissions.length > 0) {
    invariant(
      false,
      'Provided "GITHUB_TOKEN" environment variable has insufficient permissions: missing permissions "%s". Please generate a new GitHub fine-grained personal access token from this URL: %s',
      missingPermissions.join(`", "`),
      GITHUB_NEW_FINE_GRAINED_TOKEN_URL,
    )
  }
}
