import { testEnvironment } from '#/test/env.js'
import { execAsync } from '#/src/utils/exec-async.js'
import { getBranchDivergence } from '#/src/utils/git/get-branch-divergence.js'

const { setup, reset, cleanup, createRepository } = testEnvironment({
  fileSystemPath: 'get-branch-divergence',
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

it('reports no divergence when the branch is in sync with the remote', async () => {
  await createRepository('in-sync')
  const { stdout: head } = await execAsync('git rev-parse HEAD')

  expect(await getBranchDivergence('main')).toEqual({
    ahead: 0,
    behind: 0,
    remoteHash: head.trim(),
  })
})

it('reports the branch as behind when the remote has new commits', async () => {
  await createRepository('behind')
  await execAsync('git commit -m "feat: remote change" --allow-empty')
  await execAsync('git push')
  const { stdout: remoteHead } = await execAsync('git rev-parse HEAD')
  // Roll the local branch back so the remote is ahead of it.
  await execAsync('git reset --hard HEAD~1')

  expect(await getBranchDivergence('main')).toEqual({
    ahead: 0,
    behind: 1,
    remoteHash: remoteHead.trim(),
  })
})

it('reports the branch as ahead when it has unpushed commits', async () => {
  await createRepository('ahead')
  const { stdout: remoteHead } = await execAsync('git rev-parse HEAD')
  await execAsync('git commit -m "feat: local change" --allow-empty')

  expect(await getBranchDivergence('main')).toEqual({
    ahead: 1,
    behind: 0,
    remoteHash: remoteHead.trim(),
  })
})
