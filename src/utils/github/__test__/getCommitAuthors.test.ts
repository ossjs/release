import { getCommitAuthors } from '../getCommitAuthors'
import { mockCommit, mockRepo } from '../../../../test/fixtures'
import { parseCommits } from '../../git/parseCommits'
import { testEnvironment } from '../../../../test/env'
import { rest } from 'msw'

const { setup, reset, cleanup, api, log } =
  testEnvironment('get-commit-authors')

beforeAll(async () => {
  await setup()
})

afterEach(async () => {
  await reset()
})

afterAll(async () => {
  await cleanup()
})

it('returns an empty set for a commit without references', async () => {
  const commits = await parseCommits([
    mockCommit({
      subject: 'fix: just a commit',
    }),
  ])

  const authors = await getCommitAuthors(commits[0])

  expect(authors).toEqual(new Set())
})

it('returns github handles of the given commit authors', async () => {
  api.use(
    rest.get(
      'https://api.github.com/repos/:owner/:repo/issues/:id',
      (req, res, ctx) => {
        return res(
          ctx.json({
            pull_request: {},
            user: {
              login: 'octocat',
            },
          }),
        )
      },
    ),
  )
  const commits = await parseCommits([
    mockCommit({
      subject: 'fix: does things (#2)',
    }),
  ])

  const authors = await getCommitAuthors(commits[0])

  expect(authors).toEqual(new Set(['octocat']))
})

it('rejects when github responds with an error', async () => {
  api.use(
    rest.get(
      'https://api.github.com/repos/:owner/:repo/issues/:id',
      (req, res, ctx) => {
        return res(ctx.status(401))
      },
    ),
  )
  const commits = await parseCommits([
    mockCommit({
      subject: 'feat: fail fetching of this commit (#5)',
    }),
  ])

  await getCommitAuthors(commits[0])

  expect(log.error).toHaveBeenCalledWith(
    'Failed to extract the authors for the issue #5: GitHub API responded with 401.',
  )
})
