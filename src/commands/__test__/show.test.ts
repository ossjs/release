import { rest } from 'msw'
import { ReleaseStatus, Show } from '../../commands/show'
import { execAsync } from '../../utils/execAsync'
import { getTag } from '../../utils/git/getTag'
import { testEnvironment } from '../../../test/env'
import { mockConfig } from '../../../test/fixtures'

const { setup, reset, cleanup, api, log } = testEnvironment('show')

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
  const show = new Show(mockConfig(), { _: [] })

  await expect(show.run()).rejects.toThrow(
    'Failed to retrieve release tag: repository has no releases.',
  )
})

it('exits given a non-existing release', async () => {
  await execAsync('git commit -m "chore: release v1.0.0" --allow-empty')
  await execAsync(`git tag v1.0.0`)
  const show = new Show(mockConfig(), { _: ['', 'v1.2.3'] })

  await expect(show.run()).rejects.toThrow(
    'Failed to retrieve release tag: tag "v1.2.3" does not exist.',
  )
})

it('displays info for explicit unpublished release', async () => {
  api.use(
    rest.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.0.0',
      (req, res, ctx) => {
        return res(ctx.status(404), ctx.json({}))
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
  api.use(
    rest.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.0.0',
      (req, res, ctx) => {
        return res(
          ctx.json({
            draft: true,
            html_url: '/releases/v1.0.0',
          }),
        )
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
  api.use(
    rest.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.0.0',
      (req, res, ctx) => {
        return res(
          ctx.json({
            html_url: '/releases/v1.0.0',
          }),
        )
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
  api.use(
    rest.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.2.3',
      (req, res, ctx) => {
        return res(ctx.status(404), ctx.json({}))
      },
    ),
  )

  await execAsync('git commit -m "chore: release v1.2.3" --allow-empty')
  await execAsync(`git tag v1.2.3`)
  const pointer = await getTag('v1.2.3')

  const show = new Show(mockConfig(), { _: [] })
  await show.run()

  expect(log.info).toHaveBeenCalledWith('found tag "v1.2.3"!')
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
  api.use(
    rest.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.2.3',
      (req, res, ctx) => {
        return res(
          ctx.json({
            draft: true,
            html_url: '/releases/v1.2.3',
          }),
        )
      },
    ),
  )

  await execAsync('git commit -m "chore: release v1.2.3" --allow-empty')
  await execAsync(`git tag v1.2.3`)
  const pointer = await getTag('v1.2.3')

  const show = new Show(mockConfig(), { _: [] })
  await show.run()

  expect(log.info).toHaveBeenCalledWith('found tag "v1.2.3"!')
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining(`commit ${pointer!.hash}`),
  )
  expect(log.info).toHaveBeenCalledWith(
    `release status: ${ReleaseStatus.Draft}`,
  )
  expect(log.info).toHaveBeenCalledWith('release url: /releases/v1.2.3')
})

it('displays info for explicit public release', async () => {
  api.use(
    rest.get(
      'https://api.github.com/repos/:owner/:repo/releases/tags/v1.2.3',
      (req, res, ctx) => {
        return res(
          ctx.json({
            html_url: '/releases/v1.2.3',
          }),
        )
      },
    ),
  )

  await execAsync('git commit -m "chore: release v1.2.3" --allow-empty')
  await execAsync(`git tag v1.2.3`)
  const pointer = await getTag('v1.2.3')

  const show = new Show(mockConfig(), { _: [] })
  await show.run()

  expect(log.info).toHaveBeenCalledWith('found tag "v1.2.3"!')
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining(`commit ${pointer!.hash}`),
  )
  expect(log.info).toHaveBeenCalledWith(
    `release status: ${ReleaseStatus.Public}`,
  )
  expect(log.info).toHaveBeenCalledWith('release url: /releases/v1.2.3')
})
