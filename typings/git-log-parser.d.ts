declare module 'git-log-parser' {
  export const fields: Record<string, any>

  export function parse(
    config: {
      _?: string
    },
    options?: unknown
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
