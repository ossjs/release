import * as fs from 'node:fs'
import * as path from 'node:path'
import { InvariantError } from 'outvariant'
import { Ajv } from 'ajv'
import releaseConfigSchema from '#/schema.json' with { type: 'json' }

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
  const configPath = path.join(process.cwd(), 'release.config.json')
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  validateConfig(config, configPath)

  return config
}

function validateConfig(config: Config, configPath: string): void {
  const ajv = new Ajv()
  const validateConfig = ajv.compile(releaseConfigSchema)
  const isConfigValid = validateConfig(config)

  if (!isConfigValid) {
    validateConfig.errors?.forEach((error) => {
      console.error(error)
    })

    throw new InvariantError(
      'Failed to validate release configuration at "%s": the configuration is invalid. Please see the validation errors above for more details.',
      configPath,
    )
  }
}
