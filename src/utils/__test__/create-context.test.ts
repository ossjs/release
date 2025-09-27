import {
  type ReleaseContext,
  createContext,
} from '#/src/utils/create-context.js'

it('creates a context object', () => {
  const context = createContext({
    repo: {
      owner: 'octocat',
      name: 'test',
      remote: '@git@github.com:octocat/test.git',
      url: 'https://github.com/octocat/test',
    },
    latestRelease: undefined,
    nextRelease: {
      version: '1.2.3',
      publishedAt: new Date('20 Apr 2022 12:00:000 GMT'),
    },
  })

  expect(context).toEqual<ReleaseContext>({
    repo: {
      owner: 'octocat',
      name: 'test',
      remote: '@git@github.com:octocat/test.git',
      url: 'https://github.com/octocat/test',
    },
    latestRelease: undefined,
    nextRelease: {
      version: '1.2.3',
      tag: 'v1.2.3',
      publishedAt: new Date('20 Apr 2022 12:00:000 GMT'),
    },
  })
})
