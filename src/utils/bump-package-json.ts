import { readPackageJson } from '#/src/utils/read-package-json.js'
import { writePackageJson } from '#/src/utils/write-package-json.js'

export function bumpPackageJson(version: string): void {
  const packageJson = readPackageJson()
  packageJson.version = version
  writePackageJson(packageJson)
}
