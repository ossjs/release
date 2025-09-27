import * as path from 'node:path'
import { invariant } from 'outvariant'

export interface Config {
  profiles: Array<ReleaseProfile>
}

export interface ReleaseProfile {
  name: string

  /**
   * The publish script command.
   * @example npm publish $NEXT_VERSION
   * @example pnpm publish --no-git-checks
   */
  use: string

  /**
   * Indicate a pre-release version.
   * Treat breaking changes as minor release versions.
   */
  prerelease?: boolean
}

export function getConfig(): Config {
  const configPath = path.resolve(process.cwd(), 'release.config.json')
  const config = require(configPath)
  validateConfig(config)

  return config
}

function validateConfig(config: Config): void {
  invariant(
    Array.isArray(config.profiles),
    'Failed to parse Release configuration: expected a root-level "tags" property to be an array but got %j',
    config.profiles,
  )

  invariant(
    config.profiles.length > 0,
    'Failed to parse Release configuration: expected at least one profile to be defined',
  )
}
