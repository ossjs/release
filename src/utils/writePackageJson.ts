import * as fs from 'node:fs'
import * as path from 'node:path'
import { execAsync } from './execAsync'

export function writePackageJson(nextContent: Record<string, any>): void {
  const packageJsonPath = path.resolve(
    execAsync.contextOptions.cwd!.toString(),
    'package.json',
  )

  fs.writeFileSync(
    packageJsonPath,
    /**
     * @fixme Do not alter the indentation.
     */
    JSON.stringify(nextContent, null, 2),
  )
}
