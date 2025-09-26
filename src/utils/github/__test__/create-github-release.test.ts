import { http, HttpResponse } from 'msw'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { testEnvironment } from '#/test/env.js'
import { mockRepo } from '#/test/fixtures.js'
import type { GitHubRelease } from '#/src/utils/github/get-github-release.js'
import { createGitHubRelease } from '#/src/utils/github/create-github-release.js'

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
    http.get<never, never, GitHubRelease>(
      `https://api.github.com/repos/:owner/:name/releases/latest`,
      () => {
        return HttpResponse.json({
          // Set the latest GitHub release as v2.0.0.
          tag_name: 'v2.0.0',
          html_url: '/v2.0.0',
        })
      },
    ),
    http.post<never, never, GitHubRelease>(
      `https://api.github.com/repos/:owner/:name/releases`,
      async ({ request }) => {
        requestBodyPromise.resolve(request.json())
        return HttpResponse.json(
          {
            tag_name: 'v1.1.1',
            html_url: '/v1.1.1',
          },
          { status: 201 },
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
