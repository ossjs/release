import { mockCommit } from '#/test/fixtures.js'
import { getNextReleaseType } from '#/src/utils/get-next-release-type.js'
import { parseCommits } from '#/src/utils/git/parse-commits.js'

it('returns "major" for a "feat" commit that contains a "BREAKING CHANGE" footnote', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'fix: stuff',
          body: 'BREAKING CHANGE: This is a breaking change.',
        }),
      ]),
    ),
  ).toBe('major')
})

it('returns "major" for "feat" commit with a subject and a "BREAKING CHANGE" footnote', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'feat(parseUrl): support relative urls',
          body: 'BREAKING CHANGE: This is a breaking change.',
        }),
      ]),
    ),
  ).toBe('major')
})

it('returns "major" for commits with a "!" type appendix', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'feat!: some breaking change',
        }),
      ]),
    ),
  ).toBe('major')

  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'feat(customScope)!: some breaking change',
        }),
      ]),
    ),
  ).toBe('major')

  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'docs!: some breaking change',
        }),
      ]),
    ),
  ).toBe('major')
})

it('returns "minor" for "feat" commits', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'feat: adds graphql support',
        }),
      ]),
    ),
  ).toBe('minor')

  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'feat: adds graphql support',
        }),
        mockCommit({
          subject: 'fix: fix stuff',
        }),
      ]),
    ),
  ).toBe('minor')
})

it('returns "minor" for "feat" commit with a subject', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'feat(parseUrl): support nullable suffi',
        }),
      ]),
    ),
  ).toBe('minor')
})

it('returns "patch" for "fix" commits', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'fix: return signature',
        }),
      ]),
    ),
  ).toBe('patch')

  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'fix: return signature',
        }),
        mockCommit({
          subject: 'docs: mention stuff',
        }),
      ]),
    ),
  ).toBe('patch')
})

it('returns "patch" for "fix" commit with a subject', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'fix(parseUrl): support nullable suffix',
        }),
      ]),
    ),
  ).toBe('patch')
})

it('returns null when no commits bump the version', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'chore: design better releases',
        }),
        mockCommit({
          subject: 'docs: mention cli arguments',
        }),
      ]),
    ),
  ).toBe(null)
})

it('returns "minor" for a breaking change if "prerelease" option is set', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'feat(parseUrl): support relative urls',
          body: 'BREAKING CHANGE: This is a breaking change.',
        }),
      ]),
      { prerelease: true },
    ),
  ).toBe('minor')
})

it('returns "minor" for a minor change if "prerelease" option is set', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'feat: minor change',
        }),
      ]),
      { prerelease: true },
    ),
  ).toBe('minor')
})

it('returns "patch" for a patch change if "prerelease" option is set', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'fix: some fixes',
        }),
      ]),
      { prerelease: true },
    ),
  ).toBe('patch')
})

it('ignores "breaking change" text appearing in the commit message', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({ subject: 'fix: some breaking change' }),
      ]),
    ),
  ).toBe('patch')

  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({ subject: 'feat: some breaking change' }),
      ]),
    ),
  ).toBe('minor')

  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'feat: new feature',
          body: 'this is not a breaking change',
        }),
      ]),
    ),
  ).toBe('minor')

  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'docs: abc',
          body: 'should this be a BREAKING CHANGE?',
        }),
      ]),
    ),
  ).toBe(null)
})

it('ignores the exclamation mark in the commit message', async () => {
  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'fix: adds "!" as supported character',
        }),
      ]),
    ),
  ).toBe('patch')

  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'feat: adds "!" as supported character',
        }),
      ]),
    ),
  ).toBe('minor')

  expect(
    getNextReleaseType(
      await parseCommits([
        mockCommit({
          subject: 'docs: adds "!" as supported character',
        }),
      ]),
    ),
  ).toBe(null)
})
