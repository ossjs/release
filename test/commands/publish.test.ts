import { rest } from 'msw'
import { log } from '../../src/logger'
import { Publish } from '../../src/commands/publish'
import type { CreateReleaseResponse } from '../../src/utils/git/createRelease'
import { testEnvironment } from '../env'

const { setup, reset, cleanup, fs, api } = testEnvironment('publish')

beforeAll(async () => {
  await setup()
})

afterEach(async () => {
  await reset()
})

afterAll(async () => {
  await cleanup()
})

it('publishes the next minor version', async () => {
  api.use(
    rest.post<never, never, CreateReleaseResponse>(
      'https://api.github.com/repos/:owner/:repo/releases',
      (req, res, ctx) => {
        return res(
          ctx.status(201),
          ctx.json({
            html_url: '/releases/1',
          })
        )
      }
    )
  )

  await fs.create({
    'package.json': JSON.stringify({
      name: 'test',
      version: '0.0.0',
    }),
    'tarn.config.js': `
module.exports = {
  script: 'echo "release script input: $RELEASE_VERSION"',
}
    `,
  })
  await fs.exec(`git add . && git commit -m 'feat: new things'`)

  const publish = new Publish({
    script: 'echo "release script input: $RELEASE_VERSION"',
  })
  await publish.run()

  expect(log.error).not.toHaveBeenCalled()

  expect(log.info).toHaveBeenCalledWith('found %d new commit(s):', 2)

  // Must notify about the next version.
  expect(log.info).toHaveBeenCalledWith(
    'next version: %s -> %s',
    '0.0.0',
    '0.1.0'
  )

  // The release script is provided with the environmental variables.
  expect(log.info).toHaveBeenCalledWith('release script input: 0.1.0\n')

  // Must bump the "version" in package.json.
  expect(JSON.parse(await fs.readFile('package.json', 'utf8'))).toHaveProperty(
    'version',
    '0.1.0'
  )

  expect(await fs.exec('git log')).toHaveProperty(
    'stdout',
    expect.stringContaining('chore: publish v0.1.0')
  )

  // Must create a new tag for the release.
  expect(await fs.exec('git tag')).toHaveProperty(
    'stdout',
    expect.stringContaining('0.1.0')
  )

  expect(log.info).toHaveBeenCalledWith('created release: %s', '/releases/1')
})
