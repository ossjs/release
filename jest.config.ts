import type { Config } from 'jest'

const config: Config = {
  roots: ['./src'],
  transform: {
    '^.+\\.ts$': '@swc/jest',
  },
  setupFilesAfterEnv: ['./jest.setup.ts'],
}

export default config
