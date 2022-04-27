import { createTeardown } from 'fs-teardown'
import { Git } from 'node-git-server'
import { createOrigin, initGit, startGitProvider } from '../../../../test/utils'
import { execAsync } from '../../execAsync'
import { createTag } from '../createTag'

const origin = createOrigin()
const fsMock = createTeardown({
  rootDir: 'tarm/get-tags',
})

const gitProvider = new Git(fsMock.resolve('git-provider'), {
  autoCreate: true,
})
  .on('push', (push) => push.accept())
  .on('fetch', (fetch) => fetch.accept())

beforeAll(async () => {
  await fsMock.prepare()
  await startGitProvider(gitProvider, await origin.get())
  execAsync.mockContext({
    cwd: fsMock.resolve(),
  })
})

beforeEach(async () => {
  jest.restoreAllMocks()
  await fsMock.reset()
  await initGit(fsMock, origin.url)
})

afterAll(async () => {
  await fsMock.cleanup()
  await gitProvider.close()
  execAsync.restoreContext()
})

it('creates a new tag', async () => {
  expect(await createTag('1.0.0')).toBe('1.0.0')
})

it('does not create a tag when it already exists', async () => {
  jest.spyOn(console, 'error').mockImplementation()
  await execAsync('git tag 1.0.0')
  await expect(createTag('1.0.0')).rejects.toThrow(
    `fatal: tag '1.0.0' already exists`,
  )
})
