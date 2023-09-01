declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_TOKEN?: string
      /** Used by NPM */
      NODE_AUTH_TOKEN?: string
      /** Used by Yarn */
      NPM_AUTH_TOKEN?: string
    }
  }
}
export {}
