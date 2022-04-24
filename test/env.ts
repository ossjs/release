import { log } from '../src/logger'
import { createTeardown, TeardownApi } from 'fs-teardown'
import { SetupServerApi, setupServer } from 'msw/node'
import { Git } from 'node-git-server'
import { createOrigin, initGit, startGitProvider } from './utils'
import { execAsync } from '../src/utils/execAsync'

export interface TestEnvironment {
  setup(): Promise<void>
  reset(): Promise<void>
  cleanup(): Promise<void>
  api: SetupServerApi
  fs: TeardownApi
  git: Git
  log: typeof log
}

export function testEnvironment(testName: string): TestEnvironment {
  const origin = createOrigin()
  const api = setupServer()
  const fs = createTeardown({
    rootDir: `ossjs-release/${testName}`,
  })
  const git = new Git(fs.resolve('git-provider'))
  git.on('push', (push) => push.accept())
  git.on('fetch', (fetch) => fetch.accept())

  return {
    api,
    fs,
    git,
    log,
    async setup() {
      jest.spyOn(log, 'info').mockImplementation()
      jest.spyOn(log, 'warn').mockImplementation()
      jest.spyOn(log, 'error').mockImplementation()

      execAsync.mockContext({
        cwd: fs.resolve(),
      })

      api.listen()
      await fs.prepare()
      await startGitProvider(git, await origin.get())
      await initGit(fs, origin.url)
    },
    async reset() {
      jest.resetAllMocks()
      api.resetHandlers()
      await fs.reset()
      await initGit(fs, origin.url)
    },
    async cleanup() {
      execAsync.restoreContext()

      jest.restoreAllMocks()
      api.close()
      await fs.cleanup()
      await git.close()
    },
  }
}
