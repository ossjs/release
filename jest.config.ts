import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  roots: ['./src'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
}

export default config
