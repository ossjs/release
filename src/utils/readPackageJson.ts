import * as fs from 'fs'
import * as path from 'path'
import { execAsync } from './execAsync'

export function readPackageJson(): Record<string, any> {
  const packageJsonPath = path.resolve(
    execAsync.contextOptions.cwd!.toString(),
    'package.json',
  )

  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
}
