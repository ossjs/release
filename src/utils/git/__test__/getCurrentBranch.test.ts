import { createTeardown } from 'fs-teardown'
import { Git } from 'node-git-server'
import { initGit, startGitProvider } from '../../../../test/utils'
import { execAsync } from '../../execAsync'
import { getCurrentBranch } from '../getCurrentBranch'

const origin = new URL('http://localhost:3000/test.git')

const fsMock = createTeardown({
  rootDir: 'tarm/get-current-branch',
})

const gitProvider = new Git(fsMock.resolve('git-provider'), {
  autoCreate: true,
})

gitProvider.on('push', (push) => push.accept())
gitProvider.on('fetch', (fetch) => fetch.accept())

beforeAll(async () => {
  await fsMock.prepare()
  await startGitProvider(gitProvider, origin)
  execAsync.mockContext({
    cwd: fsMock.resolve(),
  })
})

beforeEach(async () => {
  await fsMock.reset()
  await initGit(fsMock, origin)
})

afterAll(async () => {
  await fsMock.cleanup()
  await gitProvider.close()
  execAsync.restoreContext()
})

it('returns the name of the current branch', async () => {
  expect(await getCurrentBranch()).toBe('master')
})

it('returns the name of the feature branch', async () => {
  await execAsync('git checkout -b feat/custom')

  expect(await getCurrentBranch()).toBe('feat/custom')
})
