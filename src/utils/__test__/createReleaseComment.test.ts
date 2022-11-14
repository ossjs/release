import { createReleaseComment } from '../createReleaseComment'
import { testEnvironment } from '../../../test/env'
import { mockRepo } from '../../../test/fixtures'
import { createContext } from '../createContext'

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

it('creates a release comment out of given release context', async () => {
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
    releaseUrl: '/releases/1',
  })

  expect(comment).toBe(`## Released: v1.2.3 🎉

This has been released in v1.2.3!

- 📄 [**Release notes**](/releases/1)
- 📦 [npm package](https://www.npmjs.com/package/my-package/v/1.2.3)

Make sure to always update to the latest version (\`npm i my-package@latest\`) to get the newest features and bug fixes.

---

_Predictable release automation by [@ossjs/release](https://github.com/ossjs/release)_.`)
})
