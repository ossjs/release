import { getCommits } from '../getCommits'
import { testEnvironment } from '../../../../test/env'
import { execAsync } from '../../execAsync'

const { setup, reset, cleanup } = testEnvironment('get-commits')

beforeAll(async () => {
  await setup()
})

afterEach(async () => {
  await reset()
})

afterAll(async () => {
  await cleanup()
})

it('returns commits from the given "after" commit hash', async () => {
  await execAsync(`git commit -m 'one' --allow-empty`)
  await execAsync(`git commit -m 'two' --allow-empty`)
  const secondCommitHash = await execAsync(`git log --pretty=format:'%H' -n 1`)
  await execAsync(`git commit -m 'three' --allow-empty`)
  const thirdCommitHash = await execAsync(`git log --pretty=format:'%H' -n 1`)

  expect(await getCommits({ after: secondCommitHash.trim() })).toEqual([
    expect.objectContaining({
      subject: 'three',
      hash: thirdCommitHash.trim(),
      body: '',
    }),
  ])
})

it(`returns all commits if not given the "after" commit hash`, async () => {
  await execAsync(`git commit -m 'one' --allow-empty`)
  const firstCommitHash = await execAsync(`git log --pretty=format:'%H' -n 1`)
  await execAsync(`git commit -m 'two' --allow-empty`)
  const secondCommitHash = await execAsync(`git log --pretty=format:'%H' -n 1`)
  await execAsync(`git commit -m 'three' --allow-empty`)
  const thirdCommitHash = await execAsync(`git log --pretty=format:'%H' -n 1`)

  expect(await getCommits()).toEqual([
    expect.objectContaining({
      subject: 'three',
      hash: thirdCommitHash.trim(),
      body: '',
    }),
    expect.objectContaining({
      subject: 'two',
      hash: secondCommitHash.trim(),
      body: '',
    }),
    expect.objectContaining({
      subject: 'one',
      hash: firstCommitHash.trim(),
      body: '',
    }),
    // This is the initial commit created by "initGit".
    expect.objectContaining({
      subject: 'chore(test): initial commit',
    }),
  ])
})
