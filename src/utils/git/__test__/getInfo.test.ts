import { createTeardown } from 'fs-teardown'
import { execAsync } from '../../execAsync'
import { getInfo, GitInfo } from '../getInfo'

const fsMock = createTeardown({
  rootDir: 'tarm/get-tags',
})

beforeAll(async () => {
  await fsMock.prepare()
  execAsync.mockContext({
    cwd: fsMock.resolve(),
  })
})

beforeEach(async () => {
  await fsMock.reset()
  jest.restoreAllMocks()
})

afterAll(async () => {
  await fsMock.cleanup()
  execAsync.restoreContext()
})

it('parses SSH remote url', async () => {
  await execAsync('git init')
  await execAsync('git remote add origin git@github.com:octocat/test.git')

  expect(await getInfo()).toEqual<GitInfo>({
    remote: 'git@github.com:octocat/test.git',
    owner: 'octocat',
    name: 'test',
    url: 'https://github.com/octocat/test/',
  })
})

it('parses HTTPS remote url', async () => {
  await execAsync('git init')
  await execAsync('git remote add origin https://github.com/octocat/test.git')

  expect(await getInfo()).toEqual<GitInfo>({
    remote: 'https://github.com/octocat/test.git',
    owner: 'octocat',
    name: 'test',
    url: 'https://github.com/octocat/test/',
  })
})
