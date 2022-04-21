import type { Commit } from 'git-log-parser'
import { getReleaseNotes, toMarkdown } from '../getReleaseNotes'
import { mockRepo } from '../../../test/fixtures'
import { createContext } from '../createContext'

describe(getReleaseNotes, () => {
  it('groups commits by commit type', async () => {
    const notes = await getReleaseNotes([
      {
        subject: 'feat: support graphql',
      },
      {
        subject: 'fix(ui): remove unsupported styles',
      },
      {
        subject: 'chore: update dependencies',
      },
    ] as Commit[])

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
    const notes = await getReleaseNotes([
      {
        subject: 'feat(api): improves stuff (#1)',
      },
    ] as Commit[])

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
    latestRelease: null,
    nextRelease: {
      version: '0.1.0',
      publishedAt: new Date('20 Apr 2022 12:00:000 GMT'),
    },
  })

  it('includes issues references in release items', async () => {
    const notes = await getReleaseNotes([
      {
        subject: 'feat(api): improves stuff (#1)',
      },
    ] as Commit[])

    const markdown = toMarkdown(context, notes)

    expect(markdown).toContain('- **api:** improves stuff (#1)')
  })

  it('retains strict order of release sections', async () => {
    const notes = await getReleaseNotes([
      { subject: 'fix: second bugfix' },
      { subject: 'fix: first bugfix' },
      { subject: 'feat: second feature' },
      { subject: 'feat: first feature' },
    ] as Commit[])
    const markdown = toMarkdown(context, notes)

    expect(markdown).toEqual(`\
## 0.1.0 (20/04/2022)

### Features

- second feature
- first feature

### Bug Fixes

- second bugfix
- first bugfix`)
  })
})
