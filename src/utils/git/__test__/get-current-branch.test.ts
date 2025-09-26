import { testEnvironment } from '#/test/env.js'
import { execAsync } from '#/src/utils/exec-async.js'
import { getCurrentBranch } from '#/src/utils/git/get-current-branch.js'

const { setup, reset, cleanup, createRepository } = testEnvironment({
  fileSystemPath: 'get-current-branch',
})

beforeAll(async () => {
  await setup()
})

afterEach(async () => {
  await reset()
})

afterAll(async () => {
  await cleanup()
})

it('returns the name of the current branch', async () => {
  await createRepository('current-branch')
  expect(await getCurrentBranch()).toBe('main')
})

it('returns the name of the feature branch', async () => {
  await createRepository('feature-branch')
  await execAsync('git checkout -b feat/custom')

  expect(await getCurrentBranch()).toBe('feat/custom')
})
