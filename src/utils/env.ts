import { invariant } from 'outvariant'

export function demandGitHubToken(): void {
  invariant(
    process.env.GITHUB_TOKEN,
    'Failed to publish the package: the "GITHUB_TOKEN" environmental variable is not provided.',
  )
}
