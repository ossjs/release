import { invariant } from 'outvariant'
import { validateAccessToken } from './github/validateAccessToken'

export async function demandGitHubToken(): Promise<void> {
  const { GITHUB_TOKEN } = process.env

  invariant(
    GITHUB_TOKEN,
    'Failed to publish the package: the "GITHUB_TOKEN" environmental variable is not provided.',
  )

  await validateAccessToken(GITHUB_TOKEN)
}
