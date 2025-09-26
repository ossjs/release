import { http, HttpResponse, type HttpResponseResolver } from 'msw'
import {
  getReleaseRefs,
  type IssueOrPullRequest,
} from '#/src/utils/release-notes/getReleaseRefs.js'
import { parseCommits } from '#/src/utils/git/parseCommits.js'
import { testEnvironment } from '#/test/env.js'
import { mockCommit } from '#/test/fixtures.js'

type IssueMap = Record<string, IssueOrPullRequest>

const { setup, reset, cleanup, api, createRepository } = testEnvironment({
  fileSystemPath: 'get-release-refs',
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

function gitHubIssueResolver(
  issues: IssueMap,
): HttpResponseResolver<{ id: string }> {
  return ({ params }) => {
    const issue = issues[params.id]

    if (!issue) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(issue)
  }
}

it('extracts references from commit messages', async () => {
  await createRepository('from-commit-message')

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
    http.get(
      'https://api.github.com/repos/:owner/:repo/issues/:id',
      gitHubIssueResolver(issues),
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
  await createRepository('ref-without-body')

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
    http.get(
      'https://api.github.com/repos/:owner/:repo/issues/:id',
      gitHubIssueResolver(issues),
    ),
  )

  const commits = await parseCommits([
    mockCommit({ subject: 'fix: add license' }),
    mockCommit({ subject: 'Make features better (#15)' }),
  ])
  const refs = await getReleaseRefs(commits)

  expect(refs).toEqual(new Set(['15']))
})
