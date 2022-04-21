declare module 'git-log-parser' {
  import { SpawnOptions } from 'child_process'

  export const fields: Record<string, any>

  export function parse(
    config: {
      _?: string
    },
    options?: SpawnOptions
  ): NodeJS.ReadableStream

  export interface Commit {
    subject: string
    hash: string
    commit: {
      long: string
      short: string
    }
    tree: {
      long: string
      short: string
    }
    author: {
      name: string
      email: string
      date: Date
    }
    committer: {
      name: string
      email: string
      date: Date
    }
    body: string
  }
}
