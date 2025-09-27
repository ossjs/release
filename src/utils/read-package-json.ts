import * as fs from 'node:fs'
import * as path from 'node:path'
import { execAsync } from '#/src/utils/exec-async.js'

export function readPackageJson(): Record<string, any> {
  const packageJsonPath = path.resolve(
    execAsync.contextOptions.cwd?.toString() || process.cwd(),
    'package.json',
  )

  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
}
