import * as path from 'path'
import { createTeardown } from 'fs-teardown'
import { Git } from 'node-git-server'
import { createOrigin, initGit, startGitProvider } from '../utils'

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

gitProvider.on('push', (push) => push.accept())
gitProvider.on('fetch', (fetch) => fetch.accept())

const cli = path.resolve(__dirname, '../..', 'bin/index.js')

beforeAll(async () => {
  await fsMock.prepare()
  await startGitProvider(gitProvider, await origin.get())
})

beforeEach(async () => {
  await fsMock.reset()
})

afterAll(async () => {
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
  script: 'echo "release script input: $RELEASE_VERSION"'
}
    `,
  })
  await initGit(fsMock, origin.url)

  await fsMock.exec(`git add . && git commit -m 'feat: new things'`)

  const { stderr, stdout } = await fsMock.exec(`${cli} publish`)

  expect(stderr).toBe('')

  // Must notify about the next version.
  expect(stdout).toContain('next version: 0.0.0 -> 0.1.0')

  // The release script is provided with the environmental variables.
  expect(stdout).toContain('release script input: 0.1.0')

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
})
