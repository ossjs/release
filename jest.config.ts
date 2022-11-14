import { Config } from '@jest/types'

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  roots: ['./src'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
}

export default config
