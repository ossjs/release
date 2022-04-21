import type { Commit } from 'git-log-parser'
import { ReleaseContext } from '../../commands/publish'
import { getReleaseNotes, toMarkdown } from '../getReleaseNotes'
import { mockRepo } from '../../../test/fixtures'

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
  const context: ReleaseContext = {
    repo: mockRepo(),
    prevVersion: '0.0.0',
    version: '0.1.0',
    publishedAt: new Date(),
  }

  it('includes issues references in release items', async () => {
    const notes = await getReleaseNotes([
      {
        subject: 'feat(api): improves stuff (#1)',
      },
    ] as Commit[])

    const markdown = toMarkdown(context, notes)

    expect(markdown).toContain('- **api:** improves stuff (#1)')
  })
})
