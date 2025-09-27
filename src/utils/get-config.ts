import * as fs from 'node:fs'
import * as path from 'node:path'
import { invariant, InvariantError } from 'outvariant'
import { Ajv } from 'ajv'
import { log } from '#/src/logger.js'
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

export function getConfig(projectPath: string): Config {
  const configPath = path.join(projectPath, 'release.config.json')

  invariant(
    fs.existsSync(configPath),
    'Failed to resolve release configuration at "%s": the configuration file is missing',
    configPath,
  )

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  validateConfig(config, configPath)

  return config
}

function validateConfig(config: Config, configPath: string): void {
  const ajv = new Ajv({
    strictSchema: true,
    validateSchema: true,
  })
  const validateConfig = ajv.compile(releaseConfigSchema)
  const isConfigValid = validateConfig(config)

  if (!isConfigValid) {
    validateConfig.errors?.forEach((error) => {
      log.error(error)
    })

    throw new InvariantError(
      'Failed to validate release configuration at "%s": the configuration is invalid. Please see the validation errors above for more details.',
      configPath,
    )
  }
}
