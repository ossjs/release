import * as path from 'path'
import { rest } from 'msw'
import { SetupServerApi, setupServer } from 'msw/node'
import { createTeardown, TeardownApi } from 'fs-teardown'
import { log } from '../src/logger'
import { initGit, createGitProvider } from './utils'
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

export interface TestEnvironmentOptions {
  fileSystemPath: string
}

export interface TestEnvironment {
  setup(): Promise<void>
  reset(): Promise<void>
  cleanup(): Promise<void>
  api: SetupServerApi
  createRepository(rootDir: string): Promise<{
    fs: TeardownApi
  }>
}

export function testEnvironment(
  options: TestEnvironmentOptions,
): TestEnvironment {
  const fs = createTeardown({
    // Place the test file system in node_modules to avoid
    // weird "/tmp" resolution issue on macOS.
    rootDir: path.resolve(__dirname, '..', `.tmp/${options.fileSystemPath}`),
  })

  const subscriptions: Array<() => Promise<any> | any> = []
  const resolveSideEffects = async () => {
    let unsubscribe: (() => Promise<any> | any) | undefined
    while ((unsubscribe = subscriptions.pop())) {
      await unsubscribe?.()
    }
  }

  return {
    api,
    async setup() {
      jest.spyOn(process, 'exit')
      jest.spyOn(log, 'info').mockImplementation()
      jest.spyOn(log, 'warn').mockImplementation()
      jest.spyOn(log, 'error').mockImplementation()

      execAsync.mockContext({
        cwd: fs.resolve(),
      })

      await fs.prepare()
    },
    async reset() {
      jest.resetAllMocks()
      await resolveSideEffects()
      await fs.reset()
    },
    async cleanup() {
      jest.restoreAllMocks()
      await resolveSideEffects()
      await fs.cleanup()
    },
    async createRepository(rootDir) {
      const absoluteRootDir = fs.resolve(rootDir)
      const repoFs = createTeardown({
        rootDir: absoluteRootDir,
      })
      await repoFs.prepare()
      subscriptions.push(() => repoFs.cleanup())

      execAsync.mockContext({
        cwd: absoluteRootDir,
      })
      subscriptions.push(() => execAsync.restoreContext())

      const git = await createGitProvider(
        absoluteRootDir,
        'octocat',
        path.basename(rootDir),
      )
      subscriptions.push(() => git.client.close())

      await initGit(repoFs, git.remoteUrl)

      return {
        fs: repoFs,
      }
    },
  }
}
