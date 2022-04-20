import type { Config } from './utils/getConfig'

export abstract class Command {
  static readonly command: string
  static readonly description: string

  constructor(protected readonly config: Config) {}

  public async run(): Promise<void> {}
}
