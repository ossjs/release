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

  return config
}
