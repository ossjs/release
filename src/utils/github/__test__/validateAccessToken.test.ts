import { rest } from 'msw'
import { api } from '../../../../test/env'
import {
  validateAccessToken,
  GITHUB_NEW_TOKEN_URL,
} from '../validateAccessToken'

it('resolves given a token with sufficient permissions', async () => {
  api.use(
    rest.get('https://api.github.com', (req, res, ctx) => {
      return res(
        ctx.set('x-oauth-scopes', 'repo, admin:repo_hook, admin:org_hook'),
      )
    }),
  )

  await expect(validateAccessToken('TOKEN')).resolves.toBeUndefined()
})

it('throws an error given a generic error response from the API', async () => {
  api.use(
    rest.get('https://api.github.com', (req, res, ctx) => {
      return res(ctx.status(500))
    }),
  )

  await expect(validateAccessToken('TOKEN')).rejects.toThrow(
    `Failed to verify GitHub token permissions: GitHub API responded with 500 Internal Server Error. Please double-check your "GITHUB_TOKEN" environmental variable and try again.`,
  )
})

it('throws an error given an API response with the missing "X-OAuth-Scopes" header', async () => {
  api.use(
    rest.get('https://api.github.com', (req, res, ctx) => {
      return res()
    }),
  )

  await expect(validateAccessToken('TOKEN')).rejects.toThrow(
    `Failed to verify GitHub token permissions: GitHub API responded with an empty "X-OAuth-Scopes" header.`,
  )
})

it('throws an error given access token without the "repo" scope', async () => {
  api.use(
    rest.get('https://api.github.com', (req, res, ctx) => {
      return res(ctx.set('x-oauth-scopes', 'admin:repo_hook, admin:org_hook'))
    }),
  )

  await expect(validateAccessToken('TOKEN')).rejects.toThrow(
    `Provided "GITHUB_TOKEN" environment variable has insufficient permissions: missing scopes "repo". Please generate a new GitHub personal access token from this URL: ${GITHUB_NEW_TOKEN_URL}`,
  )
})

it('throws an error given access token without the "admin:repo_hook" scope', async () => {
  api.use(
    rest.get('https://api.github.com', (req, res, ctx) => {
      return res(ctx.set('x-oauth-scopes', 'repo, admin:org_hook'))
    }),
  )

  await expect(validateAccessToken('TOKEN')).rejects.toThrow(
    `Provided "GITHUB_TOKEN" environment variable has insufficient permissions: missing scopes "admin:repo_hook". Please generate a new GitHub personal access token from this URL: ${GITHUB_NEW_TOKEN_URL}`,
  )
})

it('throws an error given access token without the "admin:org_hook" scope', async () => {
  api.use(
    rest.get('https://api.github.com', (req, res, ctx) => {
      return res(ctx.set('x-oauth-scopes', 'repo, admin:repo_hook'))
    }),
  )

  await expect(validateAccessToken('TOKEN')).rejects.toThrow(
    `Provided "GITHUB_TOKEN" environment variable has insufficient permissions: missing scopes "admin:org_hook". Please generate a new GitHub personal access token from this URL: ${GITHUB_NEW_TOKEN_URL}`,
  )
})

it('throws an error given access token with missing multiple scopes', async () => {
  api.use(
    rest.get('https://api.github.com', (req, res, ctx) => {
      return res(ctx.set('x-oauth-scopes', 'admin:repo_hook'))
    }),
  )

  await expect(validateAccessToken('TOKEN')).rejects.toThrow(
    `Provided "GITHUB_TOKEN" environment variable has insufficient permissions: missing scopes "repo", "admin:org_hook". Please generate a new GitHub personal access token from this URL: ${GITHUB_NEW_TOKEN_URL}`,
  )
})
