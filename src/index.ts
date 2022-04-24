import * as yargs from 'yargs'
import { invariant } from 'outvariant'
import { getConfig } from './utils/getConfig'

// Commands.
import { Show } from './commands/show'
import { Publish } from './commands/publish'

const config = getConfig()

invariant(
  process.env.GITHUB_TOKEN,
  'Failed to publish the package: the "GITHUB_TOKEN" environmental variable is not provided.'
)

yargs
  .usage('$0 <command> [options]')
  .command(
    Publish.command,
    Publish.description,
    Publish.builder,
    new Publish(config).run
  )
  .command(Show.command, Show.description, Show.builder, new Show(config).run)
  .help().argv
