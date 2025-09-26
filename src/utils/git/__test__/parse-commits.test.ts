import { mockCommit } from '#/test/fixtures.js'
import { parseCommits } from '#/src/utils/git/parse-commits.js'

it('parses commits with the "!" type appendix', async () => {
  expect(
    await parseCommits([
      mockCommit({
        subject: 'feat!: some breaking change',
      }),
      mockCommit({
        subject: 'fix(myScope)!: another change',
        body: 'commit body',
      }),
    ]),
  ).toEqual([
    {
      hash: '',
      type: 'feat',
      typeAppendix: '!',
      header: 'feat: some breaking change',
      subject: 'some breaking change',
      body: null,
      footer: null,
      merge: null,
      revert: null,
      scope: null,
      notes: [],
      mentions: [],
      references: [],
    },
    {
      hash: '',
      type: 'fix',
      typeAppendix: '!',
      header: 'fix(myScope): another change',
      subject: 'another change',
      body: 'commit body',
      footer: null,
      merge: null,
      revert: null,
      scope: 'myScope',
      notes: [],
      mentions: [],
      references: [],
    },
  ])
})
