import { http, HttpResponse, type HttpResponseResolver } from 'msw'
import { Notes } from '#/src/commands/notes.js'
import { log } from '#/src/logger.js'
import { commit } from '#/src/utils/git/commit.js'
import { testEnvironment } from '#/test/env.js'
import { execAsync } from '#/src/utils/exec-async.js'
import { type GitHubRelease } from '#/src/utils/github/get-github-release.js'

const { setup, reset, cleanup, api, createRepository } = testEnvironment({
  fileSystemPath: 'notes',
})

const gitHubReleaseResolver = vi.fn<HttpResponseResolver>(() => {
  return HttpResponse.json({ html_url: '/releases/1' }, { status: 201 })
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

it('creates a GitHub release for a past release', async () => {
  await createRepository('past-release')

  api.use(
    http.post(
      'https://api.github.com/repos/:owner/:repo/releases',
      gitHubReleaseResolver,
    ),
    http.get<never, never, GitHubRelease>(
      `https://api.github.com/repos/:owner/:name/releases/latest`,
      () => {
        return new HttpResponse(null, { status: 404 })
      },
    ),
    http.get<never, never, GitHubRelease>(
      'https://api.github.com/repos/:owner/:repo/releases/tags/:tag',
      () => {
        return new HttpResponse(null, { status: 404 })
      },
    ),
  )

  // Preceding (previous) release.
  await commit({
    message: `feat: long-ago published`,
    allowEmpty: true,
  })
  const prevReleaseCommit = await commit({
    message: `chore(release): v0.1.0`,
    allowEmpty: true,
  })
  await execAsync('git tag v0.1.0')

  // Relevant release.
  const fixCommit = await commit({
    message: `fix: relevant fix`,
    allowEmpty: true,
  })
  await commit({
    message: `docs: not worthy of release notes`,
    allowEmpty: true,
  })
  const featCommit = await commit({
    message: `feat: relevant feature`,
    allowEmpty: true,
  })
  const releaseCommit = await commit({
    message: `chore(release): v0.2.0`,
    allowEmpty: true,
    date: new Date('2005-04-07T22:13:13'),
  })
  await execAsync(`git tag v0.2.0`)

  // Future release.
  await commit({
    message: `fix: other that`,
    allowEmpty: true,
  })
  await commit({
    message: `chore(release): v0.2.1`,
    allowEmpty: true,
  })
  await execAsync(`git tag v0.2.1`)

  const notes = new Notes(
    {
      profiles: [
        {
          name: 'latest',
          use: 'exit 0',
        },
      ],
    },
    {
      _: ['', '0.2.0'],
    },
  )
  await notes.run()

  expect(log.info).toHaveBeenCalledWith(
    'creating GitHub release for version "v0.2.0" in "octocat/past-release"...',
  )

  expect(log.info).toHaveBeenCalledWith(
    `found release tag "v0.2.0" (${releaseCommit.hash})`,
  )
  expect(log.info).toHaveBeenCalledWith(
    `found preceding release "v0.1.0" (${prevReleaseCommit.hash})`,
  )

  // Must generate correct release notes.
  expect(log.info).toHaveBeenCalledWith(`generated release notes:
## v0.2.0 (2005-04-07)

### Features

- relevant feature (${featCommit.hash})

### Bug Fixes

- relevant fix (${fixCommit.hash})`)

  // Must create a new GitHub release.
  expect(gitHubReleaseResolver).toHaveBeenCalledTimes(1)
  expect(log.info).toHaveBeenCalledWith('created GitHub release: /releases/1')
})

it('skips creating a GitHub release if the given release already exists', async () => {
  await createRepository('skip-if-exists')

  api.use(
    http.post(
      'https://api.github.com/repos/:owner/:repo/releases',
      gitHubReleaseResolver,
    ),
    http.get<never, never, GitHubRelease>(
      `https://api.github.com/repos/:owner/:name/releases/latest`,
      () => {
        return new HttpResponse(null, { status: 404 })
      },
    ),
    http.get<never, never, GitHubRelease>(
      'https://api.github.com/repos/:owner/:repo/releases/tags/:tag',
      () => {
        return HttpResponse.json({
          tag_name: 'v1.0.0',
          html_url: '/releases/1',
        })
      },
    ),
  )

  const notes = new Notes(
    {
      profiles: [
        {
          name: 'latest',
          use: 'exit 0',
        },
      ],
    },
    {
      _: ['', '1.0.0'],
    },
  )
  await notes.run()

  expect(log.warn).toHaveBeenCalledWith(
    'found existing GitHub release for "v1.0.0": /releases/1',
  )
  expect(log.info).not.toHaveBeenCalledWith(
    'creating GitHub release for version "v1.0.0" in "octocat/skip-if-exists"',
  )
  expect(log.info).not.toHaveBeenCalledWith(
    expect.stringContaining('created GitHub release:'),
  )

  expect(process.exit).toHaveBeenCalledWith(1)
})
