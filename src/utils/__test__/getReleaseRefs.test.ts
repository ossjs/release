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
    '1': {
      html_url: '/issues/1',
    },
    '5': {
      html_url: '/issues/5',
    },
    '10': {
      html_url: '/issues/10',
      pull_request: [],
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
      }
    )
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
    ])
  )
})
