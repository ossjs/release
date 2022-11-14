import { invariant } from 'outvariant'
import { execAsync } from '../execAsync'

export interface GitInfo {
  owner: string
  name: string
  remote: string
  url: string
}

export async function getInfo(): Promise<GitInfo> {
  const remote = await execAsync(`git config --get remote.origin.url`).then(
    ({ stdout }) => stdout.trim(),
  )
  const [owner, name] = parseOriginUrl(remote)

  invariant(
    remote,
    'Failed to extract Git info: expected an origin URL but got %s.',
    remote,
  )
  invariant(
    owner,
    'Failed to extract Git info: expected repository owner but got %s.',
    owner,
  )
  invariant(
    name,
    'Failed to extract Git info: expected repository name but got %s.',
    name,
  )

  return {
    remote,
    owner,
    name,
    url: new URL(`https://github.com/${owner}/${name}/`).href,
  }
}

export function parseOriginUrl(origin: string): [string, string] {
  if (origin.startsWith('git@')) {
    const match = /:(.+?)\/(.+)\.git$/g.exec(origin)

    invariant(
      match,
      'Failed to parse origin URL "%s": invalid URL structure.',
      origin,
    )

    return [match[1], match[2]]
  }

  if (/^http(s)?:\/\//.test(origin)) {
    const url = new URL(origin)
    const match = /\/(.+?)\/(.+?)(\.git)?$/.exec(url.pathname)

    invariant(
      match,
      'Failed to parse origin URL "%s": invalid URL structure.',
      origin,
    )

    return [match[1], match[2]]
  }

  invariant(
    false,
    'Failed to extract repository owner/name: given origin URL "%s" is of unknown scheme (Git/HTTP/HTTPS).',
    origin,
  )
}
