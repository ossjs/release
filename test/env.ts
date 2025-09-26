import * as path from 'node:path'
import { http, HttpResponse } from 'msw'
import { type SetupServer, setupServer } from 'msw/node'
import { createTeardown, type TeardownApi } from 'fs-teardown'
import { log } from '#/src/logger.js'
import { initGit, createGitProvider } from '#/test/utils.js'
import { execAsync } from '#/src/utils/execAsync.js'
import { requiredGitHubTokenScopes } from '#/src/utils/github/validateAccessToken.js'

export const api = setupServer(
  http.get('https://api.github.com', () => {
    // Treat "GITHUB_TOKEN" environmental variable value during tests
    // as a valid GitHub personal access token with sufficient permission scopes.
    return new HttpResponse(null, {
      headers: {
        'x-oauth-scopes': requiredGitHubTokenScopes.join(', '),
      },
    })
  }),
)

beforeAll(() => {
  api.listen({
    onUnhandledRequest: 'error',
  })
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
  api: SetupServer
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
      vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
      vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
      vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
      vi.spyOn(log, 'info').mockImplementation()
      vi.spyOn(log, 'warn').mockImplementation()
      vi.spyOn(log, 'error').mockImplementation()

      execAsync.mockContext({
        cwd: fs.resolve(),
      })

      await fs.prepare()
    },
    async reset() {
      api.resetHandlers()
      vi.clearAllMocks()
      await resolveSideEffects()
      await fs.reset()
    },
    async cleanup() {
      vi.restoreAllMocks()
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
