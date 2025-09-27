import { InvariantError } from 'outvariant'
import { type Config, getConfig } from '#/src/utils/get-config.js'
import { testEnvironment } from '#/test/env.js'
import { log } from '#/src/logger.js'

const { setup, reset, cleanup, createRepository } = testEnvironment({
  fileSystemPath: 'create-release-comment',
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

it('throws an error if the config file is missing', async () => {
  const repo = await createRepository('get-config--missing-config')

  expect(() => getConfig(repo.fs.resolve())).toThrow(
    new InvariantError(
      `Failed to resolve release configuration at "${repo.fs.resolve('release.config.json')}": the configuration file is missing`,
    ),
  )
})

it('throws an error if the config file does not match the schema', async () => {
  const repo = await createRepository('get-config--missing-config')
  await repo.fs.create({
    'release.config.json': JSON.stringify({}),
  })

  expect(() => getConfig(repo.fs.resolve())).toThrow(
    new InvariantError(
      `Failed to validate release configuration at "${repo.fs.resolve('release.config.json')}": the configuration is invalid. Please see the validation errors above for more details.`,
    ),
  )

  expect(log.error).toHaveBeenCalledWith(
    expect.objectContaining({
      message: `must have required property 'profiles'`,
    }),
  )
})

it('parses and returns a valid config', async () => {
  const repo = await createRepository('get-config--missing-config')
  await repo.fs.create({
    'release.config.json': JSON.stringify({
      profiles: [{ name: 'latest', use: 'npm publish' }],
    } satisfies Config),
  })

  expect(getConfig(repo.fs.resolve())).toEqual<Config>({
    profiles: [{ name: 'latest', use: 'npm publish' }],
  })
})
