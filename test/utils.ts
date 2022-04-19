import { TeardownApi } from 'fs-teardown'

export async function initGit(fsMock: TeardownApi): Promise<void> {
  await fsMock.exec('git init')
  await fsMock.exec('git remote add origin git@github.com:octocat/test.git')
  await fsMock.exec(
    'git config user.email "actions@github.com" && git config user.name "GitHub Actions"'
  )
}
