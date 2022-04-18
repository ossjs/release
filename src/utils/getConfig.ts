import * as path from 'path'

export interface Config {
  script: string
}

export function getConfig(): Config {
  const configPath = path.resolve(process.cwd(), 'tarn.config.js')
  const config = require(configPath)

  return config
}
