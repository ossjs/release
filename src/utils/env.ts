import { invariant } from 'outvariant'
import { validateAccessToken } from '#/src/utils/github/validate-access-token.js'

export async function demandGitHubToken(): Promise<void> {
  const { GITHUB_TOKEN } = process.env

  invariant(
    GITHUB_TOKEN,
    'Failed to publish the package: the "GITHUB_TOKEN" environment variable is not provided.',
  )

  await validateAccessToken(GITHUB_TOKEN)
}

export async function demandNpmToken(): Promise<void> {
  const { NODE_AUTH_TOKEN, NPM_AUTH_TOKEN } = process.env

  invariant(
    NODE_AUTH_TOKEN || NPM_AUTH_TOKEN,
    'Failed to publish the package: neither "NODE_AUTH_TOKEN" nor "NPM_AUTH_TOKEN" environment variables were provided.',
  )
}
