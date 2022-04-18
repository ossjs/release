import { run } from '../run'

export function getCurrentBranch(): string {
  return run('git rev-parse --abbrev-ref HEAD')
}
