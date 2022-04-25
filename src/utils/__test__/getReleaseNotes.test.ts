import { getReleaseNotes, toMarkdown } from '../getReleaseNotes'
import { mockCommit, mockRepo } from '../../../test/fixtures'
import { createContext } from '../createContext'
import { parseCommits } from '../git/parseCommits'

describe(getReleaseNotes, () => {
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
    const notes = await getReleaseNotes(commits)

    expect(Array.from(notes.keys())).toEqual(['feat', 'fix'])

    expect(Array.from(notes.get('feat')!)).toEqual([
      expect.objectContaining({
        type: 'feat',
        scope: null,
        header: 'feat: support graphql',
      }),
    ])
    expect(Array.from(notes.get('fix')!)).toEqual([
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
    const notes = await getReleaseNotes(commits)

    expect(Array.from(notes.keys())).toEqual(['feat'])

    expect(Array.from(notes.get('feat')!)).toEqual([
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
    const commits = await parseCommits([
      mockCommit({
        hash: 'abc123',
        subject: 'feat(api): improves stuff (#1)',
      }),
    ])
    const notes = await getReleaseNotes(commits)
    const markdown = toMarkdown(context, notes)

    expect(markdown).toContain('- **api:** improves stuff (#1) (abc123)')
  })

  it('retains strict order of release sections', async () => {
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
## v0.1.0 (20/04/2022)

### Features

- second feature (fgh789)
- first feature (xyz321)

### Bug Fixes

- second bugfix (abc123)
- first bugfix (def456)`)
  })
})
