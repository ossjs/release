import * as portfinder from 'portfinder'
import type { TeardownApi } from 'fs-teardown'
import type { Git } from 'node-git-server'
import { invariant } from 'outvariant'

export async function initGit(fsMock: TeardownApi, origin: URL): Promise<void> {
  const remoteUrl = new URL('test.git', origin)

  await fsMock.exec('git init')
  await fsMock.exec(`git remote add origin ${remoteUrl.href}`)
  await fsMock.exec(
    'git config user.email "actions@github.com" && git config user.name "GitHub Actions"'
  )
  await fsMock.exec(
    'git add . && git commit -m "chore(test): initial commit" --allow-empty'
  )
  await fsMock.exec('git push -u origin master')
}

export async function startGitProvider(provider: Git, url: URL): Promise<void> {
  return new Promise((resolve) => {
    provider.listen(
      Number(url.port),
      {
        type: 'http',
      },
      () => resolve()
    )
  })
}

export interface Origin {
  url: URL
  get(): Promise<URL>
}

export function createOrigin(): Origin {
  let url: URL

  const result = {
    async get(): Promise<URL> {
      const port = await portfinder.getPortPromise()
      url = new URL(`http://localhost:${port}/test.git`)
      return url
    },
  }

  Object.defineProperty(result, 'url', {
    get() {
      return url
    },
    enumerable: true,
  })

  return result as Origin
}
