import * as path from 'path'
import * as portfinder from 'portfinder'
import type { TeardownApi } from 'fs-teardown'
import { Git } from 'node-git-server'
import { DeferredPromise } from '@open-draft/deferred-promise'

/**
 * Initializes a new Git repository at the given path.
 */
export async function initGit(
  fs: TeardownApi,
  remoteUrl: string | URL,
): Promise<void> {
  await fs.exec('git init')
  await fs.exec(`git remote add origin ${remoteUrl.toString()}`)
  await fs.exec(
    'git config user.email "actions@github.com" && git config user.name "GitHub Actions"',
  )
  await fs.exec('git commit -m "chore(test): initial commit" --allow-empty')
  await fs.exec('git push -u origin master')
}

/**
 * Completely removes Git from the given path.
 */
export async function removeGit(fs: TeardownApi): Promise<void> {
  await fs.exec('rm -rf ./.git')
}

export async function createGitProvider(
  rootDir: string,
  owner: string,
  repo: string,
): Promise<{
  client: Git
  remoteUrl: URL
}> {
  const client = new Git(path.resolve(rootDir, '.git-provider'))
  client.on('push', (push) => push.accept())
  client.on('fetch', (fetch) => fetch.accept())

  const port = await portfinder.getPortPromise()
  const remoteUrl = new URL(`/${owner}/${repo}.git`, `http://localhost:${port}`)

  const startPromise = new DeferredPromise<void>()
  client.listen(port, { type: 'http' }, () => {
    startPromise.resolve()
  })
  await startPromise

  return {
    client,
    remoteUrl,
  }
}
