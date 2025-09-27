import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      GITHUB_TOKEN: 'TEST_GITHUB_TOKEN',
      NODE_AUTH_TOKEN: 'TEST_NODE_AUTH_TOKEN',
    },
  },
})
