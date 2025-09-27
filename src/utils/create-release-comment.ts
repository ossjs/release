import type { ReleaseContext } from '#/src/utils/create-context.js'
import { readPackageJson } from '#/src/utils/read-package-json.js'

export interface ReleaseCommentInput {
  context: ReleaseContext
  profile: string
  releaseUrl: string
}

export function createReleaseComment(input: ReleaseCommentInput): string {
  const { context, profile, releaseUrl } = input
  const packageJson = readPackageJson()

  return `## Released: ${context.nextRelease.tag} 🎉

This has been released in ${context.nextRelease.tag}.

- 📄 [**Release notes**](${releaseUrl})
- 📦 [View on npm](https://www.npmjs.com/package/${packageJson.name}/v/${context.nextRelease.version})

Get these changes by running the following command:

\`\`\`
npm i ${packageJson.name}@${input.profile}
\`\`\`

---

_Predictable release automation by [Release](https://github.com/ossjs/release)_.`
}
