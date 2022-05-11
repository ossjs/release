import { rest } from 'msw'
import { getReleaseRefs } from '../getReleaseRefs'
import { parseCommits } from '../git/parseCommits'
import { testEnvironment } from '../../../test/env'
import { mockCommit } from '../../../test/fixtures'

const { setup, reset, cleanup, api } = testEnvironment('get-release-refs')

beforeAll(async () => {
  await setup()
})

afterEach(async () => {
  await reset()
})

afterAll(async () => {
  await cleanup()
})

it('extracts references from commit messages', async () => {
  const issues: Record<string, any> = {
    1: {
      html_url: '/issues/1',
    },
    5: {
      html_url: '/issues/5',
    },
    10: {
      html_url: '/issues/10',
      pull_request: {},
      body: `
This pull request references issues in its description.

- Closes #1
- Fixes #5
`,
    },
  }

  api.use(
    rest.get(
      'https://api.github.com/repos/:owner/:repo/issues/:id',
      (req, res, ctx) => {
        return res(ctx.json(issues[req.params.id as string]))
      },
    ),
  )

  // Create a (squash) commit that references a closed pull request.
  const commits = await parseCommits([
    mockCommit({
      subject: 'fix(ui): some stuff (#10)',
    }),
  ])
  const refs = await getReleaseRefs(commits)

  expect(refs).toEqual(
    new Set([
      // Pull request id referenced in the squash commit message.
      '10',
      // Issue id referenced in the pull request description.
      '1',
      '5',
    ]),
  )
})

it('handles references without body', async () => {
  const issues: Record<string, any> = {
    15: {
      html_url: '/issues/15',
      pull_request: {},
      // Issues or pull requests may not have any body.
      // That still subjects them to being included in the refs,
      // they just can't be parsed for any child refs.
      body: null,
    },
  }

  api.use(
    rest.get(
      'https://api.github.com/repos/:owner/:repo/issues/:id',
      (req, res, ctx) => {
        const issue = issues[req.params.id as string]
        if (!issue) {
          return res(ctx.status(404))
        }
        return res(ctx.json(issue))
      },
    ),
  )

  const commits = await parseCommits([
    mockCommit({ subject: 'fix: add license' }),
    mockCommit({ subject: 'Make features better (#15)' }),
  ])
  const refs = await getReleaseRefs(commits)

  expect(refs).toEqual(new Set(['15']))
})
