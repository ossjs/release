import * as yargs from 'yargs'
import { getConfig } from '#/src/utils/getConfig.js'

// Commands.
import { Show } from '#/src/commands/show.js'
import { Publish } from '#/src/commands/publish.js'
import { Notes } from '#/src/commands/notes.js'

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
