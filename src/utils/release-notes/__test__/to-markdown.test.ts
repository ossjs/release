import { graphql, HttpResponse } from 'msw'
import { mockCommit, mockRepo } from '#/test/fixtures.js'
import { api } from '#/test/env.js'
import { createContext } from '#/src/utils/create-context.js'
import { getReleaseNotes } from '#/src/utils/release-notes/get-release-notes.js'
import { parseCommits } from '#/src/utils/git/parse-commits.js'
import {
  toMarkdown,
  printAuthors,
} from '#/src/utils/release-notes/to-markdown.js'
import type { GetCommitAuthorsQuery } from '#/src/utils/github/getCommitAuthors.js'

/**
 * toMarkdown.
 */
describe(toMarkdown, () => {
  const context = createContext({
    repo: mockRepo(),
    latestRelease: undefined,
    nextRelease: {
      version: '0.1.0',
      publishedAt: new Date('20 Apr 2022 12:00:000 GMT'),
    },
  })

  it('includes both issue and commit reference', async () => {
    api.use(
      graphql.query<GetCommitAuthorsQuery, { pullRequestId: string }>(
        'GetCommitAuthors',
        () => {
          return HttpResponse.json({
            data: {
              repository: {
                pullRequest: {
                  url: '#1',
                  author: { login: 'octocat' },
                  commits: { nodes: [] },
                },
              },
            },
          })
        },
      ),
    )

    const commits = await parseCommits([
      mockCommit({
        hash: 'abc123',
        subject: 'feat(api): improves stuff (#1)',
      }),
    ])
    const notes = await getReleaseNotes(commits)
    const markdown = toMarkdown(context, notes)

    expect(markdown).toContain(
      '- **api:** improves stuff (#1) (abc123) @octocat',
    )
  })

  it('keeps a strict order of release sections', async () => {
    const commits = await parseCommits([
      mockCommit({
        hash: 'abc123',
        subject: 'fix: second bugfix',
      }),
      mockCommit({
        hash: 'def456',
        subject: 'fix: first bugfix',
      }),
      mockCommit({
        hash: 'fgh789',
        subject: 'feat: second feature',
      }),
      mockCommit({
        hash: 'xyz321',
        subject: 'feat: first feature',
      }),
    ])

    const notes = await getReleaseNotes(commits)
    const markdown = toMarkdown(context, notes)

    expect(markdown).toEqual(`\
## v0.1.0 (2022-04-20)

### Features

- second feature (fgh789)
- first feature (xyz321)

### Bug Fixes

- second bugfix (abc123)
- first bugfix (def456)`)
  })

  it('lists breaking changes in a separate section', async () => {
    expect(
      toMarkdown(
        context,
        await getReleaseNotes(
          await parseCommits([
            mockCommit({
              hash: 'abc123',
              subject: 'fix: regular fix',
            }),
            mockCommit({
              hash: 'def456',
              subject: 'feat: prepare functions',
              body: 'BREAKING CHANGE: Please use X instead of Y from now on.',
            }),
          ]),
        ),
      ),
    ).toEqual(`\
## v0.1.0 (2022-04-20)

### ⚠️ BREAKING CHANGES

- prepare functions (def456)

Please use X instead of Y from now on.

### Bug Fixes

- regular fix (abc123)`)

    const pullRequests: Record<
      string,
      GetCommitAuthorsQuery['repository']['pullRequest']
    > = {
      123: {
        url: '#123',
        author: { login: 'octocat' },
        commits: { nodes: [] },
      },
      456: {
        url: '#456',
        author: { login: 'john.doe' },
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
        ({ variables }) => {
          return HttpResponse.json({
            data: {
              repository: {
                pullRequest: pullRequests[variables.pullRequestId],
              },
            },
          })
        },
      ),
    )

    expect(
      toMarkdown(
        context,
        await getReleaseNotes(
          await parseCommits([
            mockCommit({
              hash: 'abc123',
              subject: 'fix: regular fix',
            }),
            mockCommit({
              hash: 'def456',
              subject: 'feat: prepare functions (#123)',
              body: 'BREAKING CHANGE: Please use X instead of Y from now on.',
            }),
            mockCommit({
              hash: 'fgh789',
              subject: 'fix(handler): correct things (#456)',
              body: `\
BREAKING CHANGE: Please notice this.

BREAKING CHANGE: Also notice this.`,
            }),
          ]),
        ),
      ),
    ).toEqual(`\
## v0.1.0 (2022-04-20)

### ⚠️ BREAKING CHANGES

- prepare functions (#123) (def456) @octocat

Please use X instead of Y from now on.

- **handler:** correct things (#456) (fgh789) @john.doe @kate

Please notice this.

Also notice this.

### Bug Fixes

- regular fix (abc123)`)
  })
})

/**
 * printAuthors.
 */
describe(printAuthors, () => {
  it('returns a single github handle', () => {
    expect(printAuthors(new Set(['octocat']))).toBe('@octocat')
  })

  it('returns the joined list of multiple github handles', () => {
    expect(printAuthors(new Set(['octocat', 'hubot']))).toBe('@octocat @hubot')
  })

  it('returns undefinde given an empty authors set', () => {
    expect(printAuthors(new Set())).toBeUndefined()
  })
})
