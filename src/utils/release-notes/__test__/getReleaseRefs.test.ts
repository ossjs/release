import { rest, ResponseResolver, RestContext, RestRequest } from 'msw'
import { getReleaseRefs, IssueOrPullRequest } from '../getReleaseRefs'
import { parseCommits } from '../../git/parseCommits'
import { testEnvironment } from '../../../../test/env'
import { mockCommit } from '../../../../test/fixtures'

type IssueMap = Record<string, IssueOrPullRequest>

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

function issueById(
  issues: IssueMap,
): ResponseResolver<RestRequest<never, { id: string }>, RestContext> {
  return (req, res, ctx) => {
    const issue = issues[req.params.id]

    if (!issue) {
      return res(ctx.status(404))
    }

    return res(ctx.json(issue))
  }
}

it('extracts references from commit messages', async () => {
  const issues: IssueMap = {
    1: {
      html_url: '/issues/1',
      pull_request: null,
      body: '',
    },
    5: {
      html_url: '/issues/5',
      pull_request: null,
      body: '',
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
      issueById(issues),
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
  const issues: IssueMap = {
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
      issueById(issues),
    ),
  )

  const commits = await parseCommits([
    mockCommit({ subject: 'fix: add license' }),
    mockCommit({ subject: 'Make features better (#15)' }),
  ])
  const refs = await getReleaseRefs(commits)

  expect(refs).toEqual(new Set(['15']))
})
