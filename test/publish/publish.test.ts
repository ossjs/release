import { createTeardown } from 'fs-teardown'
import { Git } from 'node-git-server'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { createOrigin, initGit, startGitProvider } from '../utils'
import { Publish } from '../../src/commands/publish'
import { execAsync } from '../../src/utils/execAsync'

const server = setupServer(
  /**
   * The HTTP call happens in a child process "execAsync".
   */
  rest.post(
    'https://api.github.com/repos/:owner/:repo/releases',
    (req, res, ctx) => {
      return res(
        ctx.status(201),
        ctx.json({
          url: '/releases/1',
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
  jest.spyOn(console, 'log').mockImplementation()
  jest.spyOn(console, 'error')

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

  expect(console.error).not.toHaveBeenCalled()

  expect(console.log).toHaveBeenCalledWith('found %d new commit(s):', 2)

  // Must notify about the next version.
  expect(console.log).toHaveBeenCalledWith(
    'next version: %s -> %s',
    '0.0.0',
    '0.1.0'
  )

  // The release script is provided with the environmental variables.
  expect(console.log).toHaveBeenCalledWith('release script input: 0.1.0\n')

  // Must bump the "version" in package.json.
  expect(
    JSON.parse(await fsMock.readFile('package.json', 'utf8'))
  ).toHaveProperty('version', '0.1.0')

  expect(await fsMock.exec('git log')).toHaveProperty(
    'stdout',
    expect.stringContaining('chore: release 0.1.0')
  )

  // Must create a new tag for the release.
  expect(await fsMock.exec('git tag')).toHaveProperty(
    'stdout',
    expect.stringContaining('0.1.0')
  )

  expect(console.log).toHaveBeenCalledWith('created release: %s', '/releases/1')
})
