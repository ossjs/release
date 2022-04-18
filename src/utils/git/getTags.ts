import { run } from '../run'

export function getTags(): string[] {
  return run('git tag').split('\n')
}
