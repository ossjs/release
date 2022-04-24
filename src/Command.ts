import type { BuilderCallback } from 'yargs'
import type { Config } from './utils/getConfig'

export abstract class Command<Argv extends Record<string, any> = never> {
  static readonly command: string
  static readonly description: string
  static readonly builder: BuilderCallback<{}, any> = () => {}

  constructor(protected readonly config: Config) {}

  public run = async (argv: Argv): Promise<void> => {}
}
