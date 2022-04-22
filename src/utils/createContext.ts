import type { GitInfo } from './git/getInfo'
import type { TagPointer } from './git/getTag'

export interface ReleaseContext {
  repo: GitInfo
  latestRelease?: TagPointer
  nextRelease: {
    version: string
    readonly tag: string
    publishedAt: Date
  }
}

export interface ReleaseContextInput {
  repo: GitInfo
  latestRelease?: TagPointer
  nextRelease: {
    version: string
    publishedAt: Date
  }
}

export function createContext(input: ReleaseContextInput): ReleaseContext {
  const context: ReleaseContext = {
    repo: input.repo,
    latestRelease: input.latestRelease || undefined,
    nextRelease: {
      ...input.nextRelease,
      tag: null as any,
    },
  }

  Object.defineProperty(context.nextRelease, 'tag', {
    get() {
      return `v${context.nextRelease.version}`
    },
  })

  return context
}
