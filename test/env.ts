import { rest } from 'msw'
import { SetupServerApi, setupServer } from 'msw/node'
import { createTeardown, TeardownApi } from 'fs-teardown'
import { Git } from 'node-git-server'
import { log } from '../src/logger'
import { createOrigin, initGit, startGitProvider } from './utils'
import { execAsync } from '../src/utils/execAsync'
import { requiredGitHubTokenScopes } from '../src/utils/github/validateAccessToken'

export const api = setupServer(
  rest.get('https://api.github.com', (req, res, ctx) => {
    // Treat "GITHUB_TOKEN" environmental variable value during tests
    // as a valid GitHub personal access token with sufficient permission scopes.
    return res(ctx.set('x-oauth-scopes', requiredGitHubTokenScopes.join(', ')))
  }),
)

beforeAll(() => {
  api.listen()
})

afterEach(() => {
  api.resetHandlers()
})

afterAll(() => {
  api.close()
})

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
      jest.spyOn(process, 'exit')
      jest.spyOn(log, 'info').mockImplementation()
      jest.spyOn(log, 'warn').mockImplementation()
      jest.spyOn(log, 'error').mockImplementation()

      execAsync.mockContext({
        cwd: fs.resolve(),
      })

      await fs.prepare()
      await startGitProvider(git, await origin.get())
      await initGit(fs, origin.url)
    },
    async reset() {
      jest.resetAllMocks()
      await fs.reset()
      await initGit(fs, origin.url)
    },
    async cleanup() {
      execAsync.restoreContext()

      jest.restoreAllMocks()
      await fs.cleanup()
      await git.close()
    },
  }
}
