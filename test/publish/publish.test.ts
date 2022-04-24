import { createTeardown } from 'fs-teardown'
import { Git } from 'node-git-server'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { log } from '../../src/logger'
import { createOrigin, initGit, startGitProvider } from '../utils'
import { Publish } from '../../src/commands/publish'
import { execAsync } from '../../src/utils/execAsync'
import type { CreateReleaseResponse } from '../../src/utils/git/createRelease'

const server = setupServer(
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

const fsMock = createTeardown({
  rootDir: 'tarm/publish',
  paths: {
    'git-provider': null,
  },
})

const origin = createOrigin()

const gitProvider = new Git(fsMock.resolve('git-provider'), {
  autoCreate: true,
})
  .on('push', (push) => push.accept())
  .on('fetch', (fetch) => fetch.accept())

beforeAll(async () => {
  jest.spyOn(log, 'info').mockImplementation()
  jest.spyOn(log, 'error')

  execAsync.mockContext({
    cwd: fsMock.resolve(),
  })
  server.listen({
    onUnhandledRequest: 'error',
  })
  await fsMock.prepare()
  await startGitProvider(gitProvider, await origin.get())
})

afterEach(async () => {
  jest.resetAllMocks()
  server.resetHandlers()
  await fsMock.reset()
})

afterAll(async () => {
  jest.restoreAllMocks()
  execAsync.restoreContext()
  server.close()
  await fsMock.cleanup()
  await gitProvider.close()
})

it('publishes the next minor version', async () => {
  await fsMock.create({
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
  await initGit(fsMock, origin.url)
  await fsMock.exec(`git add . && git commit -m 'feat: new things'`)

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
  expect(
    JSON.parse(await fsMock.readFile('package.json', 'utf8'))
  ).toHaveProperty('version', '0.1.0')

  expect(await fsMock.exec('git log')).toHaveProperty(
    'stdout',
    expect.stringContaining('chore: publish v0.1.0')
  )

  // Must create a new tag for the release.
  expect(await fsMock.exec('git tag')).toHaveProperty(
    'stdout',
    expect.stringContaining('0.1.0')
  )

  expect(log.info).toHaveBeenCalledWith('created release: %s', '/releases/1')
})
