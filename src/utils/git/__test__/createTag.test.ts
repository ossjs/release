import { testEnvironment } from '../../../../test/env'
import { execAsync } from '../../execAsync'
import { createTag } from '../createTag'

const { setup, reset, cleanup, createRepository } = testEnvironment({
  fileSystemPath: 'create-tag',
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

it('creates a new tag', async () => {
  await createRepository('new-tag')
  expect(await createTag('1.0.0')).toBe('1.0.0')
})

it('does not create a tag when it already exists', async () => {
  await createRepository('existing-tag')

  jest.spyOn(console, 'error').mockImplementation()
  await execAsync('git tag 1.0.0')
  await expect(createTag('1.0.0')).rejects.toThrow(
    `fatal: tag '1.0.0' already exists`,
  )
})
