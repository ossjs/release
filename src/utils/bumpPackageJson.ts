import * as fs from 'fs'
import * as path from 'path'
import { execAsync } from './execAsync'

export function bumpPackageJson(version: string): void {
  const packageJsonPath = path.resolve(
    execAsync.contextOptions.cwd!.toString(),
    'package.json'
  )

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  packageJson.version = version
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
}
