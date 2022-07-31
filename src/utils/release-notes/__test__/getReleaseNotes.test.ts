import {
  groupCommitsByReleaseType,
  injectReleaseContributors,
} from '../getReleaseNotes'
import { mockCommit } from '../../../../test/fixtures'
import { parseCommits } from '../../git/parseCommits'
import { testEnvironment } from '../../../../test/env'
import { graphql } from 'msw'
import { GetCommitAuthorsQuery } from '../../github/getCommitAuthors'

/**
 * groupCommitsByReleaseType.
 */
describe(groupCommitsByReleaseType, () => {
  it('groups commits by commit type', async () => {
    const commits = await parseCommits([
      mockCommit({
        subject: 'feat: support graphql',
      }),
      mockCommit({
        subject: 'fix(ui): remove unsupported styles',
      }),
      mockCommit({
        subject: 'chore: update dependencies',
      }),
    ])
    const groups = await groupCommitsByReleaseType(commits)

    expect(Array.from(groups.keys())).toEqual(['feat', 'fix'])
    expect(Array.from(groups.get('feat')!)).toEqual([
      expect.objectContaining({
        type: 'feat',
        scope: null,
        header: 'feat: support graphql',
      }),
    ])
    expect(Array.from(groups.get('fix')!)).toEqual([
      expect.objectContaining({
        type: 'fix',
        scope: 'ui',
        header: 'fix(ui): remove unsupported styles',
      }),
    ])
  })

  it('includes issues references', async () => {
    const commits = await parseCommits([
      mockCommit({
        subject: 'feat(api): improves stuff (#1)',
      }),
    ])
    const groups = await groupCommitsByReleaseType(commits)

    expect(Array.from(groups.keys())).toEqual(['feat'])
    expect(Array.from(groups.get('feat')!)).toEqual([
      expect.objectContaining({
        type: 'feat',
        subject: 'improves stuff (#1)',
        references: [
          expect.objectContaining({
            issue: '1',
            prefix: '#',
          }),
        ],
      }),
    ])
  })
})

describe(injectReleaseContributors, () => {
  const { setup, reset, cleanup, api } = testEnvironment(
    'injectReleaseContributors',
  )

  beforeAll(async () => {
    await setup()
  })

  afterEach(async () => {
    await reset()
  })

  afterAll(async () => {
    await cleanup()
  })

  it('injects contributors handles alongside related commits', async () => {
    const pullRequests: Record<
      string,
      GetCommitAuthorsQuery['repository']['pullRequest']
    > = {
      1: {
        url: '#1',
        author: { login: 'octocat' },
        commits: {
          nodes: [
            {
              commit: { authors: { nodes: [{ user: { login: 'octocat' } }] } },
            },
          ],
        },
      },
      2: {
        url: '#2',
        author: { login: 'octocat' },
        commits: {
          nodes: [
            {
              commit: { authors: { nodes: [{ user: { login: 'octocat' } }] } },
            },
            {
              commit: {
                authors: {
                  nodes: [
                    { user: { login: 'octocat' } },
                    { user: { login: 'john.doe' } },
                  ],
                },
              },
            },
          ],
        },
      },
      3: {
        url: '#3',
        author: { login: 'kate' },
        commits: {
          nodes: [
            {
              commit: { authors: { nodes: [{ user: { login: 'kate' } }] } },
            },
          ],
        },
      },
    }

    api.use(
      graphql.query<GetCommitAuthorsQuery, { pullRequestId: string }>(
        'GetCommitAuthors',
        (req, res, ctx) => {
          return res(
            ctx.data({
              repository: {
                pullRequest: pullRequests[req.variables.pullRequestId],
              },
            }),
          )
        },
      ),
    )

    const commits = await parseCommits([
      mockCommit({
        subject: 'feat: first (#1)',
      }),
      mockCommit({
        subject: 'fix(ui): second (#2)',
      }),
      mockCommit({
        subject: 'chore: third (#3)',
      }),
    ])
    const groups = await groupCommitsByReleaseType(commits)
    const notes = await injectReleaseContributors(groups)

    const features = Array.from(notes.get('feat')!)
    expect(features).toHaveLength(1)
    expect(features[0].authors).toEqual(new Set(['octocat']))

    const fixes = Array.from(notes.get('fix')!)
    expect(fixes).toHaveLength(1)
    expect(fixes[0].authors).toEqual(new Set(['john.doe', 'octocat']))
  })
})
