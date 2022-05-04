import { log } from './logger'
import type { BuilderCallback } from 'yargs'
import type { Config } from './utils/getConfig'

export interface DefaultArgv {
  _: (number | string)[]
}

export abstract class Command<Argv extends Record<string, any> = {}> {
  static readonly command: string
  static readonly description: string
  static readonly builder: BuilderCallback<{}, any> = () => {}

  protected log: typeof log

  constructor(
    protected readonly config: Config,
    protected readonly argv: DefaultArgv & Argv,
  ) {
    this.log = log
  }

  public run = async (): Promise<void> => {}
}
