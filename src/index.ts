#!/usr/bin/env node
import * as yargs from 'yargs'

// Commands.
import { publish } from './commands/publish'

yargs
  .usage('$0 <command> [options]')
  .command('publish', 'Publish a package.', publish)
  .help().argv
