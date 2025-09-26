import { testEnvironment } from '#/test/env.js'
import { execAsync } from '#/src/utils/execAsync.js'
import { getTags } from '#/src/utils/git/getTags.js'

const { setup, reset, cleanup, createRepository } = testEnvironment({
  fileSystemPath: 'get-tags',
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

it('returns empty array when there are no tags', async () => {
  await createRepository('no-tags')
  await expect(getTags()).resolves.toEqual([])
})

it('returns a single existing tag', async () => {
  await createRepository('single-tag')
  await execAsync('git tag 1.2.3')

  await expect(getTags()).resolves.toEqual(['1.2.3'])
})

it('returns mutliple existing tags', async () => {
  await createRepository('multiple-tags')

  await execAsync('git tag 1.0.0')
  await execAsync('git tag 1.0.5')
  await execAsync('git tag 2.3.1')

  await expect(getTags()).resolves.toEqual(['1.0.0', '1.0.5', '2.3.1'])
})
