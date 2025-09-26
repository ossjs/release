import type { ReleaseContext } from './createContext.js'
import { readPackageJson } from './readPackageJson.js'

export interface ReleaseCommentInput {
  context: ReleaseContext
  releaseUrl: string
}

export function createReleaseComment(input: ReleaseCommentInput): string {
  const { context, releaseUrl } = input
  const packageJson = readPackageJson()

  return `## Released: ${context.nextRelease.tag} 🎉

This has been released in ${context.nextRelease.tag}!

- 📄 [**Release notes**](${releaseUrl})
- 📦 [npm package](https://www.npmjs.com/package/${packageJson.name}/v/${context.nextRelease.version})

Make sure to always update to the latest version (\`npm i ${packageJson.name}@latest\`) to get the newest features and bug fixes.

---

_Predictable release automation by [@ossjs/release](https://github.com/ossjs/release)_.`
}
