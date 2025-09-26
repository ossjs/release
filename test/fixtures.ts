import type { Commit } from 'git-log-parser'
import type { Config } from '#/src/utils/getConfig.js'
import type { GitInfo } from '#/src/utils/git/getInfo.js'
import type { ParsedCommitWithHash } from '#/src/utils/git/parseCommits.js'

export function mockConfig(config: Partial<Config> = {}): Config {
  return {
    profiles: [
      {
        name: 'latest',
        use: 'echo "hello world"',
      },
    ],
    ...config,
  }
}

export function mockRepo(repo: Partial<GitInfo> = {}): GitInfo {
  return {
    remote: 'git@github.com:octocat/test.git',
    owner: 'octocat',
    name: 'test',
    url: 'https://github.com/octocat/test/',
    ...repo,
  }
}

export function mockCommit(commit: Partial<Commit> = {}): Commit {
  return {
    body: '',
    subject: '',
    hash: '',
    commit: {
      long: '',
      short: '',
    },
    tree: {
      long: '',
      short: '',
    },
    author: {
      name: 'octocat',
      email: 'octocat@github.com',
      date: new Date(),
    },
    committer: {
      name: 'octocat',
      email: 'octocat@github.com',
      date: new Date(),
    },
    ...commit,
  }
}

export function mockParsedCommit(
  commit: Partial<ParsedCommitWithHash> = {},
): ParsedCommitWithHash {
  return {
    subject: '',
    merge: '',
    mentions: [] as any,
    references: [] as any,
    footer: '',
    header: '',
    body: '',
    hash: '',
    notes: [] as any,
    revert: null as any,
    ...commit,
  }
}
