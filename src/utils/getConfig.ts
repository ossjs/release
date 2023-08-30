import { invariant } from 'outvariant'
import * as path from 'path'

export interface Config {
  /**
   * The publish script command.
   * @example npm publish $NEXT_VERSION
   * @example pnpm publish --no-git-checks
   */
  use: string
}

export function getConfig(): Config {
  const configPath = path.resolve(process.cwd(), 'release.config.json')
  const config = require(configPath)
  validateConfig(config)

  return config
}

function validateConfig(config: Config): void {
  invariant(
    typeof config.use === 'string',
    'Failed to parse Release configuration: expected a root-level "use" property to be a string but got %s',
    typeof config.use,
  )
}
