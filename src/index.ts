import * as yargs from 'yargs'
import { getConfig } from './utils/getConfig'

// Commands.
import { Show } from './commands/show'
import { Publish } from './commands/publish'

const config = getConfig()

yargs
  .usage('$0 <command> [options]')
  .command(Publish.command, Publish.description, Publish.builder, (argv) =>
    new Publish(config, argv).run(),
  )
  .command(Show.command, Show.description, Show.builder, (argv) =>
    new Show(config, argv).run(),
  )
  .help().argv
