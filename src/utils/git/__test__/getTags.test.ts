import { createTeardown } from 'fs-teardown'
import { Git } from 'node-git-server'
import { createOrigin, initGit, startGitProvider } from '../../../../test/utils'
import { execAsync } from '../../execAsync'
import { getTags } from '../getTags'

const origin = createOrigin()
const fsMock = createTeardown({
  rootDir: 'tarm/get-tags',
})

const gitProvider = new Git(fsMock.resolve('git-provider'), {
  autoCreate: true,
})

gitProvider.on('push', (push) => push.accept())
gitProvider.on('fetch', (fetch) => fetch.accept())

beforeAll(async () => {
  await fsMock.prepare()
  await startGitProvider(gitProvider, await origin.get())
  execAsync.mockContext({
    cwd: fsMock.resolve(),
  })
})

beforeEach(async () => {
  await fsMock.reset()
  await initGit(fsMock, origin.url)
})

afterAll(async () => {
  await fsMock.cleanup()
  await gitProvider.close()
  execAsync.restoreContext()
})

it('returns empty array when there are no tags', async () => {
  expect(await getTags()).toEqual([])
})

it('returns a single existing tag', async () => {
  await execAsync('git tag 1.2.3')

  expect(await getTags()).toEqual(['1.2.3'])
})

it('returns mutliple existing tags', async () => {
  await execAsync('git tag 1.0.0')
  await execAsync('git tag 1.0.5')
  await execAsync('git tag 2.3.1')

  expect(await getTags()).toEqual(['1.0.0', '1.0.5', '2.3.1'])
})
