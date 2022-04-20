#!/usr/bin/env node
import * as yargs from 'yargs'
import { getConfig } from './utils/getConfig'

// Commands.
import { Publish } from './commands/publish'

const config = getConfig()

yargs
  .usage('$0 <command> [options]')
  .command(Publish.command, Publish.description, new Publish(config).run)
  .help().argv
