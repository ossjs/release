#!/usr/bin/env node
import * as yargs from 'yargs'
import { getConfig } from './utils/getConfig'

// Commands.
import { publish } from './commands/publish'

const config = getConfig()

yargs
  .usage('$0 <command> [options]')
  .command('publish', 'Publish a package.', publish.bind(this, config))
  .help().argv
