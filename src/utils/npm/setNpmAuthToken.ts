import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import rc from 'rc'
import getAuthToken, { AuthOptions } from 'registry-auth-token'
import { execAsync } from '../execAsync'

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)

const NPM_REGISTRY_URL = 'https://registry.npmjs.org/'

export async function setNpmAuthToken(): Promise<void> {
  const NPMRC_PATH =
    process.env.NPM_CONFIG_USERCONFIG ||
    path.resolve(
      execAsync.contextOptions.cwd?.toString() || process.cwd(),
      '.npmrc',
    )

  const { configs, ...rcConfig } = rc(
    'npm',
    {
      registry: NPM_REGISTRY_URL,
    },
    {
      config: NPMRC_PATH,
    },
  )

  const npmConfig: string = configs
    ? await Promise.all(
        configs
          .filter((configPath) => !configPath.startsWith('/private/'))
          .map((configPath) => readFile(configPath)),
      ).then((configList) => configList.join('\n'))
    : ''

  // .npmrc already has auth token configured, skipping.
  if (
    getAuthToken(NPM_REGISTRY_URL, {
      npmrc: rcConfig as AuthOptions['npmrc'],
    })
  ) {
    return
  }

  const registryEntry = `${toIdentifier(
    NPM_REGISTRY_URL,
  )}:_authToken = \${NPM_TOKEN}`

  await writeFile(
    NPMRC_PATH,
    [npmConfig, registryEntry].filter(Boolean).join('\n'),
  )
}

export function toIdentifier(url: string): string {
  const record = new URL(url)
  return `//${record.hostname}/${record.pathname}/`.replace(/\/+$/, '/')
}
