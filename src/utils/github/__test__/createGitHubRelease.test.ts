import { rest } from 'msw'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { testEnvironment } from '../../../../test/env'
import { mockRepo } from '../../../../test/fixtures'
import type { GitHubRelease } from '../getGitHubRelease'
import { createGitHubRelease } from '../createGitHubRelease'

const { setup, reset, cleanup, api } = testEnvironment({
  fileSystemPath: 'create-github-release',
})

beforeAll(async () => {
  await setup()
})

afterEach(async () => {
  await reset()
})

afterAll(async () => {
  await cleanup()
})

it('marks the release as non-latest if there is a higher version released on GitHub', async () => {
  const repo = mockRepo()
  const requestBodyPromise = new DeferredPromise()
  api.use(
    rest.get<never, never, GitHubRelease>(
      `https://api.github.com/repos/:owner/:name/releases/latest`,
      (req, res, ctx) => {
        return res(
          // Set the latest GitHub release as v2.0.0.
          ctx.json({
            tag_name: 'v2.0.0',
            html_url: '/v2.0.0',
          }),
        )
      },
    ),
    rest.post<never, never, GitHubRelease>(
      `https://api.github.com/repos/:owner/:name/releases`,
      (req, res, ctx) => {
        requestBodyPromise.resolve(req.json())
        return res(
          ctx.status(201),
          ctx.json({
            tag_name: 'v1.1.1',
            html_url: '/v1.1.1',
          }),
        )
      },
    ),
  )

  // Try to release a backport version for v1.0.0.
  const notes = '# Release notes'
  const githubRelease = await createGitHubRelease(
    {
      repo,
      nextRelease: {
        version: '1.1.1',
        tag: 'v1.1.1',
        publishedAt: new Date(),
      },
    },
    notes,
  )
  expect(githubRelease).toHaveProperty('html_url', '/v1.1.1')

  const requestBody = await requestBodyPromise
  expect(requestBody).toEqual({
    tag_name: 'v1.1.1',
    name: 'v1.1.1',
    body: notes,
    // Must set "false" as the value of the "make_latest" property.
    make_latest: 'false',
  })
})
