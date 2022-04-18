import * as gitLogParser from 'git-log-parser'
import { getNextReleaseType } from '../getNextReleaseType'

function mockCommit(
  initialValues: Partial<gitLogParser.Commit> = {}
): gitLogParser.Commit {
  return {
    commit: {
      short: '',
      long: '',
    },
    subject: '',
    body: '',
    hash: '',
    tree: {
      short: '',
      long: '',
    },
    author: {
      name: 'John Doe',
      email: 'john@doe.com',
      date: new Date(),
    },
    committer: {
      name: 'John Doe',
      email: 'john@doe.com',
      date: new Date(),
    },
    ...initialValues,
  }
}

it('returns "major" for a commit that contains a "BREAKING CHANGE" footnote', () => {
  expect(
    getNextReleaseType([
      mockCommit({
        subject: 'fix: stuff',
        body: 'BREAKING CHANGE: This is a breaking change.',
      }),
    ])
  ).toBe('major')
})

it('returns "minor" for "feat" commits', () => {
  expect(
    getNextReleaseType([
      mockCommit({
        subject: 'feat: adds graphql support',
      }),
    ])
  ).toBe('minor')

  expect(
    getNextReleaseType([
      mockCommit({
        subject: 'feat: adds graphql support',
      }),
      mockCommit({
        subject: 'fix: fix stuff',
      }),
    ])
  ).toBe('minor')
})

it('returns patch for "fix" commits', () => {
  expect(
    getNextReleaseType([
      mockCommit({
        subject: 'fix: return signature',
      }),
    ])
  ).toBe('patch')

  expect(
    getNextReleaseType([
      mockCommit({
        subject: 'fix: return signature',
      }),
      mockCommit({
        subject: 'docs: mention stuff',
      }),
    ])
  ).toBe('patch')
})

it('returns null when no commits bump the version', () => {
  expect(
    getNextReleaseType([
      mockCommit({
        subject: 'chore: design better releases',
      }),
      mockCommit({
        subject: 'docs: mention cli arguments',
      }),
    ])
  ).toBe(null)
})
