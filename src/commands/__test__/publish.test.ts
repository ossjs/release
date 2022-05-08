import * as fileSystem from 'fs'
import { ResponseResolver, rest } from 'msw'
import { log } from '../../logger'
import { Publish } from '../publish'
import type { GitHubRelease } from '../../utils/github/getGitHubRelease'
import { testEnvironment } from '../../../test/env'
import { execAsync } from '../../utils/execAsync'

const { setup, reset, cleanup, fs, api } = testEnvironment('publish')

beforeAll(async () => {
  await setup()
})

afterEach(async () => {
  await reset()
})

afterAll(async () => {
  await cleanup()
})

it('publishes the next minor version', async () => {
  api.use(
    rest.post<never, never, GitHubRelease>(
      'https://api.github.com/repos/:owner/:repo/releases',
      (req, res, ctx) => {
        return res(
          ctx.status(201),
          ctx.json({
            html_url: '/releases/1',
          }),
        )
      },
    ),
  )

  await fs.create({
    'package.json': JSON.stringify({
      name: 'test',
      version: '0.0.0',
    }),
    'ossjs.release.config.js': `
module.exports = {
  script: 'echo "release script input: $RELEASE_VERSION"',
}
    `,
  })
  await fs.exec(`git add . && git commit -m 'feat: new things'`)

  const publish = new Publish(
    {
      script: 'echo "release script input: $RELEASE_VERSION"',
    },
    { _: [] },
  )
  await publish.run()

  expect(log.error).not.toHaveBeenCalled()

  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining('found 2 new commits:'),
  )

  // Must notify about the next version.
  expect(log.info).toHaveBeenCalledWith('next version: 0.0.0 -> 0.1.0')

  // The release script is provided with the environmental variables.
  expect(log.info).toHaveBeenCalledWith('release script input: 0.1.0\n')

  // Must bump the "version" in package.json.
  expect(JSON.parse(await fs.readFile('package.json', 'utf8'))).toHaveProperty(
    'version',
    '0.1.0',
  )

  expect(await fs.exec('git log')).toHaveProperty(
    'stdout',
    expect.stringContaining('chore(release): v0.1.0'),
  )

  // Must create a new tag for the release.
  expect(await fs.exec('git tag')).toHaveProperty(
    'stdout',
    expect.stringContaining('0.1.0'),
  )

  expect(log.info).toHaveBeenCalledWith('created release: /releases/1')
  expect(log.info).toHaveBeenCalledWith('release "v0.1.0" completed!')
})

it('releases a new version after an existing version', async () => {
  api.use(
    rest.post<never, never, GitHubRelease>(
      'https://api.github.com/repos/:owner/:repo/releases',
      (req, res, ctx) => {
        return res(
          ctx.status(201),
          ctx.json({
            html_url: '/releases/1',
          }),
        )
      },
    ),
  )

  await fs.create({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.2.3',
    }),
  })
  await execAsync(`git commit -m 'chore(release): v1.2.3' --allow-empty`)
  await execAsync('git tag v1.2.3')
  await execAsync(`git commit -m 'fix: stuff' --allow-empty`)
  await execAsync(`git commit -m 'feat: stuff' --allow-empty`)

  const publish = new Publish(
    {
      script: 'echo "release script input: $RELEASE_VERSION"',
    },
    { _: [] },
  )
  await publish.run()

  expect(log.error).not.toHaveBeenCalled()
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining('found 2 new commits:'),
  )

  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining('found latest release: v1.2.3'),
  )

  // Must notify about the next version.
  expect(log.info).toHaveBeenCalledWith('next version: 1.2.3 -> 1.3.0')

  // The release script is provided with the environmental variables.
  expect(log.info).toHaveBeenCalledWith('release script input: 1.3.0\n')

  // Must bump the "version" in package.json.
  expect(JSON.parse(await fs.readFile('package.json', 'utf8'))).toHaveProperty(
    'version',
    '1.3.0',
  )

  expect(await fs.exec('git log')).toHaveProperty(
    'stdout',
    expect.stringContaining('chore(release): v1.3.0'),
  )

  // Must create a new tag for the release.
  expect(await fs.exec('git tag')).toHaveProperty(
    'stdout',
    expect.stringContaining('v1.3.0'),
  )

  expect(log.info).toHaveBeenCalledWith('created release: /releases/1')
  expect(log.info).toHaveBeenCalledWith('release "v1.3.0" completed!')
})

it('comments on relevant github issues', async () => {
  const commentsCreated = new Map<string, string>()

  api.use(
    rest.post<never, never, GitHubRelease>(
      'https://api.github.com/repos/:owner/:repo/releases',
      (req, res, ctx) => {
        return res(
          ctx.status(201),
          ctx.json({
            html_url: '/releases/1',
          }),
        )
      },
    ),
    rest.get(
      'https://api.github.com/repos/:owner/:repo/issues/:id',
      (req, res, ctx) => {
        return res(ctx.json({}))
      },
    ),
    rest.post<{ body: string }>(
      'https://api.github.com/repos/:owner/:repo/issues/:id/comments',
      (req, res, ctx) => {
        commentsCreated.set(req.params.id as string, req.body.body)
        return res(ctx.status(201))
      },
    ),
  )

  await fs.create({
    'package.json': JSON.stringify({
      name: 'test',
      version: '0.0.0',
    }),
    'ossjs.release.config.js': `
module.exports = {
  script: 'echo "release script input: $RELEASE_VERSION"',
}
    `,
  })
  await fs.exec(`git commit -m 'feat: supports graphql (#10)' --allow-empty`)

  const publish = new Publish(
    {
      script: 'echo "release script input: $RELEASE_VERSION"',
    },
    { _: [] },
  )
  await publish.run()

  expect(log.info).toHaveBeenCalledWith('commenting on 1 GitHub issue:\n  - 10')
  expect(commentsCreated).toEqual(
    new Map([['10', expect.stringContaining('## Released: v0.1.0 🎉')]]),
  )

  expect(log.info).toHaveBeenCalledWith('release "v0.1.0" completed!')
})

it('supports dry-run mode', async () => {
  const gitHubReleaseHandler = jest.fn<
    ReturnType<ResponseResolver>,
    Parameters<ResponseResolver>
  >((req, res, ctx) => {
    return res(ctx.status(500))
  })
  api.use(
    rest.post<never, never, GitHubRelease>(
      'https://api.github.com/repos/:owner/:repo/releases',
      gitHubReleaseHandler,
    ),
    rest.get(
      'https://api.github.com/repos/octocat/test/issues/:id',
      (req, res, ctx) => {
        return res(ctx.json({}))
      },
    ),
  )

  await fs.create({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.2.3',
    }),
    'ossjs.release.config.js': `
module.exports = {
  script: 'exit 0',
}
    `,
  })
  await execAsync(`git commit -m 'chore(release): v1.2.3' --allow-empty`)
  await execAsync('git tag v1.2.3')
  await execAsync(`git commit -m 'fix: stuff (#2)' --allow-empty`)
  await execAsync(`git commit -m 'feat: stuff' --allow-empty`)

  const publish = new Publish(
    {
      script: 'touch release.script.artifact',
    },
    {
      _: [],
      dryRun: true,
    },
  )
  await publish.run()

  expect(log.info).toHaveBeenCalledWith(
    'preparing release for "octocat/test" from branch "master"...',
  )
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining('found 2 new commits:'),
  )

  // Package.json version bump.
  expect(log.info).toHaveBeenCalledWith('next release type: minor')
  expect(log.info).toHaveBeenCalledWith('next version: 1.2.3 -> 1.3.0')
  expect(log.warn).toHaveBeenCalledWith(
    'skip version bump in package.json in dry-run mode (next: 1.3.0)',
  )
  expect(JSON.parse(await fs.readFile('package.json', 'utf8'))).toHaveProperty(
    'version',
    '1.2.3',
  )

  // Publishing script.
  expect(log.warn).toHaveBeenCalledWith(
    'skip executing publishing script in dry-run mode',
  )
  expect(fileSystem.existsSync(fs.resolve('release.script.artifact'))).toBe(
    false,
  )

  // Release commit.
  expect(log.warn).toHaveBeenCalledWith(
    'skip creating a release commit in dry-run mode: "chore(release): v1.3.0"',
  )
  expect(log.info).not.toHaveBeenCalledWith('created release commit!')

  // Release tag.
  expect(log.warn).toHaveBeenCalledWith(
    'skip creating a release tag in dry-run mode: v1.3.0',
  )
  expect(log.info).not.toHaveBeenCalledWith('created release tag "v1.3.0"!')
  expect(await execAsync('git tag')).toBe('v1.2.3\n')

  // Release notes.
  expect(log.info).toHaveBeenCalledWith(
    expect.stringContaining('generated release notes:\n\n## v1.3.0'),
  )
  expect(log.warn).toHaveBeenCalledWith(
    'skip creating a GitHub release in dry-run mode',
  )
  expect(gitHubReleaseHandler).not.toHaveBeenCalled()

  expect(log.warn).toHaveBeenCalledWith(
    'release "v1.3.0" completed in dry-run mode!',
  )
})
