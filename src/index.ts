import * as yargs from 'yargs'
import { getConfig } from './utils/getConfig'

// Commands.
import { Show } from './commands/show'
import { Publish } from './commands/publish'
import { Notes } from './commands/notes'

const config = getConfig()

yargs
  .usage('$0 <command> [options]')
  .command(Publish.command, Publish.description, Publish.builder, (argv) =>
    new Publish(config, argv).run(),
  )
  .command(Notes.command, Notes.description, Notes.builder, (argv) => {
    return new Notes(config, argv).run()
  })
  .command(Show.command, Show.description, Show.builder, (argv) =>
    new Show(config, argv).run(),
  )
  .help().argv
