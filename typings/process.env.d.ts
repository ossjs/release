declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_TOKEN?: string
      NPM_TOKEN?: string
    }
  }
}
export {}
