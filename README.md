oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g tarm
$ tarm COMMAND
running command...
$ tarm (--version)
tarm/0.0.0 darwin-x64 node-v16.14.0
$ tarm --help [COMMAND]
USAGE
  $ tarm COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`tarm hello PERSON`](#tarm-hello-person)
* [`tarm hello world`](#tarm-hello-world)
* [`tarm help [COMMAND]`](#tarm-help-command)
* [`tarm plugins`](#tarm-plugins)
* [`tarm plugins:install PLUGIN...`](#tarm-pluginsinstall-plugin)
* [`tarm plugins:inspect PLUGIN...`](#tarm-pluginsinspect-plugin)
* [`tarm plugins:install PLUGIN...`](#tarm-pluginsinstall-plugin-1)
* [`tarm plugins:link PLUGIN`](#tarm-pluginslink-plugin)
* [`tarm plugins:uninstall PLUGIN...`](#tarm-pluginsuninstall-plugin)
* [`tarm plugins:uninstall PLUGIN...`](#tarm-pluginsuninstall-plugin-1)
* [`tarm plugins:uninstall PLUGIN...`](#tarm-pluginsuninstall-plugin-2)
* [`tarm plugins update`](#tarm-plugins-update)

## `tarm hello PERSON`

Say hello

```
USAGE
  $ tarm hello [PERSON] -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Whom is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/kettanaito/tarm/blob/v0.0.0/dist/commands/hello/index.ts)_

## `tarm hello world`

Say hello world

```
USAGE
  $ tarm hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ oex hello world
  hello world! (./src/commands/hello/world.ts)
```

## `tarm help [COMMAND]`

Display help for tarm.

```
USAGE
  $ tarm help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for tarm.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.10/src/commands/help.ts)_

## `tarm plugins`

List installed plugins.

```
USAGE
  $ tarm plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ tarm plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/index.ts)_

## `tarm plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ tarm plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ tarm plugins add

EXAMPLES
  $ tarm plugins:install myplugin 

  $ tarm plugins:install https://github.com/someuser/someplugin

  $ tarm plugins:install someuser/someplugin
```

## `tarm plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ tarm plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ tarm plugins:inspect myplugin
```

## `tarm plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ tarm plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ tarm plugins add

EXAMPLES
  $ tarm plugins:install myplugin 

  $ tarm plugins:install https://github.com/someuser/someplugin

  $ tarm plugins:install someuser/someplugin
```

## `tarm plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ tarm plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLES
  $ tarm plugins:link myplugin
```

## `tarm plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ tarm plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ tarm plugins unlink
  $ tarm plugins remove
```

## `tarm plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ tarm plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ tarm plugins unlink
  $ tarm plugins remove
```

## `tarm plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ tarm plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ tarm plugins unlink
  $ tarm plugins remove
```

## `tarm plugins update`

Update installed plugins.

```
USAGE
  $ tarm plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```
<!-- commandsstop -->
