import { Config } from '../src/utils/getConfig'
import { GitInfo } from '../src/utils/git/getInfo'

export function mockConfig(config: Partial<Config> = {}): Config {
  return {
    script: 'echo "hello world"',
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
