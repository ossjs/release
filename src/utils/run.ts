import { execSync } from 'node:child_process'

export function run(command: string): string {
  return execSync(command).toString('utf8').trim()
}
