import { http, HttpResponse } from 'msw'
import { ReleaseStatus, Show } from '#/src/commands/show.js'
import { log } from '#/src/logger.js'
import { execAsync } from '#/src/utils/exec-async.js'
import { getTag } from '#/src/utils/git/get-tag.js'
import { testEnvironment } from '#/test/env.js'
import { mockConfig } from '#/test/fixtures.js'
import { commit } from '#/src/utils/git/commit.js'

const { setup, reset, cleanup, api, createRepository } = testEnvironment({
  fileSystemPath: 'show',
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

it('exits given repository without any releases', async () => {
  await createRepository('repo-without-releases')
  const show = new Show(mockConfig(), { _: [''] })

  await expect(show.run()).rejects.toThrow(
    'Failed to retrieve release tag: repository has no releases.',
  )
})

it('exits given a non-existing release', async () => {
  await createRepository('repo-with-release')

  await execAsync('git commit -m "chore: release v1.0.0" --allow-empty')
  await execAsync(`git tag v1.0.0`)
  const show = new Show(mockConfig(), { _: ['', 'v1.2.3'] })

  await expect(show.run()).rejects.toThrow(
    'Failed to retrieve release tag: tag "v1.2.3" does not exist.',
  )
})

it('displays info for explicit unpublished release', async () => {
  await createRepository('repo-with-unpublished-release')

  api.use(
    http.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.0.0',
      () => {
        return HttpResponse.json({}, { status: 404 })
      },
    ),
  )

  await execAsync('git commit -m "chore: release v1.0.0" --allow-empty')
  await execAsync(`git tag v1.0.0`)
  const pointer = await getTag('v1.0.0')

  const show = new Show(mockConfig(), { _: ['', 'v1.0.0'] })
  await show.run()

  expect(log.info).toHaveBeenCalledWith('found tag "v1.0.0"!')
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining(`commit ${pointer!.hash}`),
  )
  expect(log.info).toHaveBeenCalledWith(
    `release status: ${ReleaseStatus.Unpublished}`,
  )
  expect(log.info).not.toHaveBeenCalledWith(
    expect.stringContaining('release url:'),
  )
})

it('displays info for explicit draft release', async () => {
  await createRepository('repo-with-draft-release')

  api.use(
    http.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.0.0',
      () => {
        return HttpResponse.json({
          draft: true,
          html_url: '/releases/v1.0.0',
        })
      },
    ),
  )

  await execAsync('git commit -m "chore: release v1.0.0" --allow-empty')
  await execAsync(`git tag v1.0.0`)
  const pointer = await getTag('v1.0.0')

  const show = new Show(mockConfig(), { _: ['', 'v1.0.0'] })
  await show.run()

  expect(log.info).toHaveBeenCalledWith('found tag "v1.0.0"!')
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining(`commit ${pointer!.hash}`),
  )
  expect(log.info).toHaveBeenCalledWith(
    `release status: ${ReleaseStatus.Draft}`,
  )
  expect(log.info).toHaveBeenCalledWith('release url: /releases/v1.0.0')
})

it('displays info for explicit public release', async () => {
  await createRepository('repo-with-public-release')

  api.use(
    http.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.0.0',
      () => {
        return HttpResponse.json({
          html_url: '/releases/v1.0.0',
        })
      },
    ),
  )

  await execAsync('git commit -m "chore: release v1.0.0" --allow-empty')
  await execAsync(`git tag v1.0.0`)
  const pointer = await getTag('v1.0.0')

  const show = new Show(mockConfig(), { _: ['', 'v1.0.0'] })
  await show.run()

  expect(log.info).toHaveBeenCalledWith('found tag "v1.0.0"!')
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining(`commit ${pointer!.hash}`),
  )
  expect(log.info).toHaveBeenCalledWith(
    `release status: ${ReleaseStatus.Public}`,
  )
  expect(log.info).toHaveBeenCalledWith('release url: /releases/v1.0.0')
})

it('displays info for implicit unpublished release', async () => {
  await createRepository('repo-with-implicit-unpublished-release')

  api.use(
    http.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.2.3',
      () => {
        return HttpResponse.json({}, { status: 404 })
      },
    ),
  )

  const releaseCommit = await commit({
    message: 'chore(release): v1.2.3',
    allowEmpty: true,
  })
  await execAsync(`git tag v1.2.3`)

  const show = new Show(mockConfig(), { _: [''] })
  await show.run()

  expect(log.info).toHaveBeenCalledWith('found tag "v1.2.3"!')
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining(`commit ${releaseCommit.hash}`),
  )
  expect(log.info).toHaveBeenCalledWith(
    `release status: ${ReleaseStatus.Unpublished}`,
  )
  expect(log.info).not.toHaveBeenCalledWith(
    expect.stringContaining('release url:'),
  )
})

it('displays info for explicit draft release', async () => {
  await createRepository('repo-with-explicit-draft-release')

  api.use(
    http.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.2.3',
      () => {
        return HttpResponse.json({
          draft: true,
          html_url: '/releases/v1.2.3',
        })
      },
    ),
  )

  const releaseCommit = await commit({
    message: 'chore(release): v1.2.3',
    allowEmpty: true,
  })
  await execAsync(`git tag v1.2.3`)

  const show = new Show(mockConfig(), { _: [''] })
  await show.run()

  expect(log.info).toHaveBeenCalledWith('found tag "v1.2.3"!')
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining(`commit ${releaseCommit.hash}`),
  )
  expect(log.info).toHaveBeenCalledWith(
    `release status: ${ReleaseStatus.Draft}`,
  )
  expect(log.info).toHaveBeenCalledWith('release url: /releases/v1.2.3')
})

it('displays info for explicit public release', async () => {
  await createRepository('repo-with-explicit-public-release')

  api.use(
    http.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.2.3',
      () => {
        return HttpResponse.json({
          html_url: '/releases/v1.2.3',
        })
      },
    ),
  )

  const releaseCommit = await commit({
    message: 'chore(release): v1.2.3',
    allowEmpty: true,
  })
  await execAsync(`git tag v1.2.3`)

  const show = new Show(mockConfig(), { _: [''] })
  await show.run()

  expect(log.info).toHaveBeenCalledWith('found tag "v1.2.3"!')
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining(`commit ${releaseCommit.hash}`),
  )
  expect(log.info).toHaveBeenCalledWith(
    `release status: ${ReleaseStatus.Public}`,
  )
  expect(log.info).toHaveBeenCalledWith('release url: /releases/v1.2.3')
})
