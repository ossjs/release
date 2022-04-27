import * as fs from 'fs'
import { readPackageJson } from './readPackageJson'
import { writePackageJson } from './writePackageJson'

export function bumpPackageJson(version: string): void {
  const packageJson = readPackageJson()
  packageJson.version = version

  writePackageJson(packageJson)
}
