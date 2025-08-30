# @xgsd/cli

A CLI for interacting with xGSD APIs (WIP) - you probably don't need this

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)

# Todo

- Hook process events to auto seal configuration/encryption key ("--hardened" mode)

<!-- toc -->

- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @xgsd/cli
$ xgsd COMMAND
running command...
$ xgsd (--version)
@xgsd/cli/0.0.0 linux-x64 node-v24.4.1
$ xgsd --help [COMMAND]
USAGE
  $ xgsd COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`xgsd hello PERSON`](#xgsd-hello-person)
- [`xgsd hello world`](#xgsd-hello-world)
- [`xgsd help [COMMAND]`](#xgsd-help-command)
- [`xgsd plugins`](#xgsd-plugins)
- [`xgsd plugins add PLUGIN`](#xgsd-plugins-add-plugin)
- [`xgsd plugins:inspect PLUGIN...`](#xgsd-pluginsinspect-plugin)
- [`xgsd plugins install PLUGIN`](#xgsd-plugins-install-plugin)
- [`xgsd plugins link PATH`](#xgsd-plugins-link-path)
- [`xgsd plugins remove [PLUGIN]`](#xgsd-plugins-remove-plugin)
- [`xgsd plugins reset`](#xgsd-plugins-reset)
- [`xgsd plugins uninstall [PLUGIN]`](#xgsd-plugins-uninstall-plugin)
- [`xgsd plugins unlink [PLUGIN]`](#xgsd-plugins-unlink-plugin)
- [`xgsd plugins update`](#xgsd-plugins-update)

## `xgsd hello PERSON`

Say hello

```
USAGE
  $ xgsd hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ xgsd hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/xgsd/cli/blob/v0.0.0/src/commands/hello/index.ts)_

## `xgsd hello world`

Say hello world

```
USAGE
  $ xgsd hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ xgsd hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/xgsd/cli/blob/v0.0.0/src/commands/hello/world.ts)_

## `xgsd help [COMMAND]`

Display help for xgsd.

```
USAGE
  $ xgsd help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for xgsd.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.32/src/commands/help.ts)_

## `xgsd plugins`

List installed plugins.

```
USAGE
  $ xgsd plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ xgsd plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/index.ts)_

## `xgsd plugins add PLUGIN`

Installs a plugin into xgsd.

```
USAGE
  $ xgsd plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into xgsd.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the XGSD_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the XGSD_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ xgsd plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ xgsd plugins add myplugin

  Install a plugin from a github url.

    $ xgsd plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ xgsd plugins add someuser/someplugin
```

## `xgsd plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ xgsd plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ xgsd plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/inspect.ts)_

## `xgsd plugins install PLUGIN`

Installs a plugin into xgsd.

```
USAGE
  $ xgsd plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into xgsd.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the XGSD_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the XGSD_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ xgsd plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ xgsd plugins install myplugin

  Install a plugin from a github url.

    $ xgsd plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ xgsd plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/install.ts)_

## `xgsd plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ xgsd plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ xgsd plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/link.ts)_

## `xgsd plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ xgsd plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ xgsd plugins unlink
  $ xgsd plugins remove

EXAMPLES
  $ xgsd plugins remove myplugin
```

## `xgsd plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ xgsd plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/reset.ts)_

## `xgsd plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ xgsd plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ xgsd plugins unlink
  $ xgsd plugins remove

EXAMPLES
  $ xgsd plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/uninstall.ts)_

## `xgsd plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ xgsd plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ xgsd plugins unlink
  $ xgsd plugins remove

EXAMPLES
  $ xgsd plugins unlink myplugin
```

## `xgsd plugins update`

Update installed plugins.

```
USAGE
  $ xgsd plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/update.ts)_

<!-- commandsstop -->
