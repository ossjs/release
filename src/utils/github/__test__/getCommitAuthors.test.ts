import { getCommitAuthors } from '../getCommitAuthors'
import { mockCommit, mockRepo } from '../../../../test/fixtures'
import { parseCommits } from '../../git/parseCommits'
import { testEnvironment } from '../../../../test/env'
import { graphql, rest } from 'msw'

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

it('returns github handle for the pull request author if they are the only contributor', async () => {
  api.use(
    graphql.query('GetCommitAuthors', (req, res, ctx) => {
      return res(
        ctx.data({
          repository: {
            pullRequest: {
              author: { login: 'octocat' },
              commits: {
                nodes: [
                  {
                    commit: {
                      authors: {
                        nodes: [
                          {
                            user: { login: 'octocat' },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
      )
    }),
  )

  const commits = await parseCommits([
    mockCommit({
      subject: 'fix: does things (#1)',
    }),
  ])

  const authors = await getCommitAuthors(commits[0])

  expect(authors).toEqual(new Set(['octocat']))
})

it('returns github handles for all contributors to the release commit', async () => {
  api.use(
    graphql.query('GetCommitAuthors', (req, res, ctx) => {
      return res(
        ctx.data({
          repository: {
            pullRequest: {
              author: { login: 'octocat' },
              commits: {
                nodes: [
                  {
                    // Commit by the pull request author.
                    commit: {
                      authors: {
                        nodes: [
                          {
                            user: { login: 'octocat' },
                          },
                        ],
                      },
                    },
                  },
                  // Commit by another user in the same pull request.
                  {
                    commit: {
                      authors: {
                        nodes: [
                          {
                            user: { login: 'john.doe' },
                          },
                        ],
                      },
                    },
                  },
                  // Commit authored my multiple users in the same pull request.
                  {
                    commit: {
                      authors: {
                        nodes: [
                          {
                            user: { login: 'kate' },
                          },
                          {
                            user: { login: 'john.doe' },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
      )
    }),
  )
  const commits = await parseCommits([
    mockCommit({
      subject: 'fix: does things (#1)',
    }),
  ])

  const authors = await getCommitAuthors(commits[0])

  expect(authors).toEqual(new Set(['octocat', 'john.doe', 'kate']))
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

it('forwards github graphql errors', async () => {
  const errors = [{ message: 'one' }, { message: 'two' }]
  api.use(
    graphql.query('GetCommitAuthors', (req, res, ctx) => {
      return res(ctx.errors(errors))
    }),
  )
  const commits = await parseCommits([
    mockCommit({
      subject: 'feat: fail fetching of this commit (#5)',
    }),
  ])

  await getCommitAuthors(commits[0])

  expect(log.error).toHaveBeenCalledWith(
    `Failed to extract the authors for the issue #5: GitHub API responded with 2 error(s): ${JSON.stringify(
      errors,
    )}`,
  )
})

it('forwards github server errors', async () => {
  api.use(
    graphql.query('GetCommitAuthors', (req, res, ctx) => {
      return res(ctx.status(401))
    }),
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
