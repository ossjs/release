import { createReleaseComment } from '#/src/utils/create-release-comment.js'
import { testEnvironment } from '#/test/env.js'
import { mockRepo } from '#/test/fixtures.js'
import { createContext } from '#/src/utils/create-context.js'

const { setup, reset, cleanup, createRepository } = testEnvironment({
  fileSystemPath: 'create-release-comment',
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

it('creates a release comment for the "latest" profile', async () => {
  const repo = await createRepository('release-from-context')

  await repo.fs.create({
    'package.json': JSON.stringify({
      name: 'my-package',
    }),
  })

  const comment = createReleaseComment({
    context: createContext({
      repo: mockRepo(),
      nextRelease: {
        version: '1.2.3',
        publishedAt: new Date(),
      },
    }),
    profile: 'latest',
    releaseUrl: '/releases/1',
  })

  expect(comment).toBe(`## Released: v1.2.3 🎉

This has been released in v1.2.3.

- 📄 [**Release notes**](/releases/1)
- 📦 [View on npm](https://www.npmjs.com/package/my-package/v/1.2.3)

Get these changes by running the following command:

\`\`\`
npm i my-package@latest
\`\`\`

---

_Predictable release automation by [Release](https://github.com/ossjs/release)_.`)
})

it('respects custom release profiles in the release comment', async () => {
  const repo = await createRepository('release-from-context')

  await repo.fs.create({
    'package.json': JSON.stringify({
      name: 'my-package',
    }),
  })

  const comment = createReleaseComment({
    context: createContext({
      repo: mockRepo(),
      nextRelease: {
        version: '1.2.3',
        publishedAt: new Date(),
      },
    }),
    profile: 'backport',
    releaseUrl: '/releases/1',
  })

  expect(comment).toBe(`## Released: v1.2.3 🎉

This has been released in v1.2.3.

- 📄 [**Release notes**](/releases/1)
- 📦 [View on npm](https://www.npmjs.com/package/my-package/v/1.2.3)

Get these changes by running the following command:

\`\`\`
npm i my-package@backport
\`\`\`

---

_Predictable release automation by [Release](https://github.com/ossjs/release)_.`)
})
