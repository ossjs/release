import { mockParsedCommit } from '../../../test/fixtures'
import { getNextReleaseType } from '../getNextReleaseType'

it('returns "major" for a commit that contains a "BREAKING CHANGE" footnote', () => {
  expect(
    getNextReleaseType([
      mockParsedCommit({
        header: 'fix: stuff',
        body: 'BREAKING CHANGE: This is a breaking change.',
      }),
    ]),
  ).toBe('major')
})

it('returns "minor" for "feat" commits', () => {
  expect(
    getNextReleaseType([
      mockParsedCommit({
        header: 'feat: adds graphql support',
      }),
    ]),
  ).toBe('minor')

  expect(
    getNextReleaseType([
      mockParsedCommit({
        header: 'feat: adds graphql support',
      }),
      mockParsedCommit({
        header: 'fix: fix stuff',
      }),
    ]),
  ).toBe('minor')
})

it('returns patch for "fix" commits', () => {
  expect(
    getNextReleaseType([
      mockParsedCommit({
        header: 'fix: return signature',
      }),
    ]),
  ).toBe('patch')

  expect(
    getNextReleaseType([
      mockParsedCommit({
        header: 'fix: return signature',
      }),
      mockParsedCommit({
        header: 'docs: mention stuff',
      }),
    ]),
  ).toBe('patch')
})

it('returns null when no commits bump the version', () => {
  expect(
    getNextReleaseType([
      mockParsedCommit({
        header: 'chore: design better releases',
      }),
      mockParsedCommit({
        header: 'docs: mention cli arguments',
      }),
    ]),
  ).toBe(null)
})
