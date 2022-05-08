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

it('returns commits since the given commit', async () => {
  await execAsync(`git commit -m 'one' --allow-empty`)
  await execAsync(`git commit -m 'two' --allow-empty`)
  const secondCommitHash = await execAsync(`git log --pretty=format:'%H' -n 1`)
  await execAsync(`git commit -m 'three' --allow-empty`)
  const thirdCommitHash = await execAsync(`git log --pretty=format:'%H' -n 1`)

  expect(await getCommits({ since: secondCommitHash.trim() })).toEqual([
    expect.objectContaining({
      subject: 'three',
      hash: thirdCommitHash.trim(),
    }),
  ])
})

it('returns commits until the given commit', async () => {
  await execAsync(`git commit -m 'one' --allow-empty`)
  const oneCommitHash = await execAsync(`git log --pretty=format:%H -n 1`)
  await execAsync(`git commit -m 'two' --allow-empty`)
  const secondCommitHash = await execAsync(`git log --pretty=format:%H -n 1`)
  await execAsync(`git commit -m 'three' --allow-empty`)

  expect(await getCommits({ until: secondCommitHash.trim() })).toEqual([
    expect.objectContaining({
      subject: 'one',
      hash: oneCommitHash.trim(),
    }),
    expect.objectContaining({
      subject: 'chore(test): initial commit',
      hash: expect.any(String),
    }),
  ])
})

it('returns commits within the range', async () => {
  await execAsync(`git commit -m 'one' --allow-empty`)
  await execAsync(`git commit -m 'two' --allow-empty`)
  const secondCommitHash = await execAsync(`git log --pretty=format:'%H' -n 1`)
  await execAsync(`git commit -m 'three' --allow-empty`)
  const thirdCommitHash = await execAsync(`git log --pretty=format:'%H' -n 1`)
  await execAsync(`git commit -m 'four' --allow-empty`)
  const fourthCommitHash = await execAsync(`git log --pretty=format:'%H' -n 1`)

  expect(
    await getCommits({
      since: secondCommitHash.trim(),
      until: fourthCommitHash.trim(),
    }),
  ).toEqual([
    expect.objectContaining({
      subject: 'four',
      hash: fourthCommitHash.trim(),
    }),
    expect.objectContaining({
      subject: 'three',
      hash: thirdCommitHash.trim(),
    }),
  ])
})

it('returns all commits when called without any range', async () => {
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
    }),
    expect.objectContaining({
      subject: 'two',
      hash: secondCommitHash.trim(),
    }),
    expect.objectContaining({
      subject: 'one',
      hash: firstCommitHash.trim(),
    }),
    // This is the initial commit created by "initGit".
    expect.objectContaining({
      subject: 'chore(test): initial commit',
    }),
  ])
})
