import { createTeardown } from 'fs-teardown'
import { execAsync } from '#/src/utils/exec-async.js'
import { getInfo, type GitInfo } from '#/src/utils/git/get-info.js'

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
  vi.restoreAllMocks()
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

it('parses HTTPS remote url without the ".git" suffix', async () => {
  await execAsync('git init')
  await execAsync('git remote add origin https://github.com/octocat/test')

  expect(await getInfo()).toEqual<GitInfo>({
    remote: 'https://github.com/octocat/test',
    owner: 'octocat',
    name: 'test',
    url: 'https://github.com/octocat/test/',
  })
})
