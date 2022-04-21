import { GitInfo } from '../src/utils/git/getInfo'

export function mockRepo(repo: Partial<GitInfo> = {}): GitInfo {
  return {
    remote: 'git@github.com:octocat/test.git',
    owner: 'octocat',
    name: 'test',
    ...repo,
  }
}
