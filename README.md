# xGSD Command-Line Interface (CLI) - (`@xgsd/cli`)

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)
[![tests](https://github.com/Isolated-/xgsd-cli/actions/workflows/test.yml/badge.svg)](https://github.com/Isolated-/xgsd-cli/actions/workflows/test.yml)

A privacy-first automation and orchestration runtime for developers. Think AWS Lambda, but portable — runs on your laptop, in your cloud, or even on a Raspberry Pi. Local, lightweight, and blazing fast.

**Whilst every effort is made to protect your data, please ensure you do your part to keep your information secure. Treat any encryption keys, secrets, passwords, or anything "sensitive" with care to ensure you’re protected. Don't forget to `xgsd seal` once you've finished working.**

There are _many_ orchestration (FaaS/ETL) options available, none focus on privacy, security, and local execution as much as xGSD does. Free and open source, no external dependencies, and nothing to manage - it just works.

## Installation

Getting started is easy, first you'll need the xGSD CLI:

```sh
# using nodejs
npm install -g @xgsd/cli

# using yarn
yarn install -g @xgsd/cli

# using apt (coming soon)
sudo update -y && sudo upgrade -y
sudo apt install xgsd
```

Once you've done that you're ready to start building with xGSD. There are a few ways to get up and running depending on what you need. If you just need secure storage for files (or any data), then you can get started by checking out `$ xgsd storage --help`.

## Quickstart

_This is a Quickstart for Pipelines_

Before you get started, create a new folder for your pipeline the same you would any npm package:

```sh
mkdir mypipeline
npm init -y
```

Create a configuration file:

```yaml
# basic info
name: My First Pipeline
description: A simple pipeline to demonstrate xGSD capabilities
runner: xgsd@v1

# metadata is for your use
metadata:
  version: 1
  production: false

# store logs and result
collect:
  logs: true
  run: true

# these are passed to all steps
# timeout is for each step in ms
options:
  timeout: 5000
  maxRetries: 3

# step config should be simple
# and require little to no info beyond name + action
steps:
  - name: Uppercase Data
    description: converts the input data to uppercase
    action: upperCaseAction
  - name: Hash Data
    description: hashes the input data
    action: hashDataAction
  - name: Fetch Some API Data
    description: get some data from httpbin.org
    action: fetchData
```

And declare your functions/actions:

```js
const crypto = require('crypto')
const axios = require('axios')

const upperCaseAction = async (context) => {
  return {data: context.data.toUpperCase()}
}

const hashDataAction = (context) => {
  return {
    data: crypto.createHash('sha256').update(context.data).digest('hex'),
    url: 'http://httpbin.org/json',
  }
}

const fetchData = async (context) => {
  const response = await axios.get(context.url)
  return response.data
}

module.exports = {
  upperCaseAction,
  hashDataAction,
  fetchData,
  blockingAction,
  failingAction,
}
```

And finally run your pipeline with `$ xgsd run path/to/module -d path/to/data.json -w`.

## Testing

Pipelines, actions, and storage are covered with extensive tests. You can run them with:

```sh
# regular (all tests)
yarn test

# watch mode
yarn test:watch

# generate docs
yarn docs
```

## Changes

Changes to the internal structure of **pipelines** and **actions** are almost definite, however, this will not introduce breaking features. Key management, and cryptography will only be updated should there be a security issue or absolute need to.

## Support

If you need help with this CLI, don't hesitate to contact me. You can reach me via email at [**mike@xgsd.io**](mailto:mike@xgsd.io). Please ensure you've completed some level of troubleshooting and remember that everything is encrypted and our servers have zero knowledge of your data, so support for any of your data is limited. _Anything_ else is not — I’m here to help with technical support, usage guidelines, or if you've found a bug that needs fixing. Feel free to review the code and make any improvements without contact too [you can do that here](https://github.com/Isolated-/xgsd-cli).

## Feedback

No analytic data is, or will be, collected from your machine. Please feel free to reach out with suggestions, criticism, or just to let me know what you're using this for (see **Support**).

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes, incompatible API modifications.
- **MINOR** (0.x.0): Backwards-compatible new features and improvements.
- **PATCH** (0.0.x): Backwards-compatible bug fixes or small internal improvements.

Pre-release tags (e.g., `1.2.0-beta.1`) may be used for testing before stable releases.

## Privacy & Security

Most of the features in this project are a response to the UKs changes in regulation toward providers and are designed to mitigate the threats posed by Online Safety Act (OSA), Investigatory Powers Act (IPA), and the proposed Chat Control.

**We do not and will not support weakening of encryption, state-owned backdoors, or any form of violating our users right to privacy.**

A full security overview will be published once everything is up and running. Please feel free to check the code ([here](https://github.com/Isolated-/xgsd-cli)) if you're concerned about how your data is managed.

<!-- commands -->
* [`xgsd config keys [OPERATION] [EXTRA]`](#xgsd-config-keys-operation-extra)
* [`xgsd hello PERSON`](#xgsd-hello-person)
* [`xgsd hello world`](#xgsd-hello-world)
* [`xgsd help [COMMAND]`](#xgsd-help-command)
* [`xgsd hook register HOOK`](#xgsd-hook-register-hook)
* [`xgsd keys [OPERATION] [EXTRA]`](#xgsd-keys-operation-extra)
* [`xgsd plugins`](#xgsd-plugins)
* [`xgsd plugins add PLUGIN`](#xgsd-plugins-add-plugin)
* [`xgsd plugins:inspect PLUGIN...`](#xgsd-pluginsinspect-plugin)
* [`xgsd plugins install PLUGIN`](#xgsd-plugins-install-plugin)
* [`xgsd plugins link PATH`](#xgsd-plugins-link-path)
* [`xgsd plugins remove [PLUGIN]`](#xgsd-plugins-remove-plugin)
* [`xgsd plugins reset`](#xgsd-plugins-reset)
* [`xgsd plugins uninstall [PLUGIN]`](#xgsd-plugins-uninstall-plugin)
* [`xgsd plugins unlink [PLUGIN]`](#xgsd-plugins-unlink-plugin)
* [`xgsd plugins update`](#xgsd-plugins-update)
* [`xgsd run FUNCTION`](#xgsd-run-function)
* [`xgsd validate`](#xgsd-validate)

## `xgsd config keys [OPERATION] [EXTRA]`

describe the command here

```
USAGE
  $ xgsd config keys [OPERATION] [EXTRA] [-f] [--raw] [-p <value>] [-r <value>] [-w <value>] [-c <value>] [-v
    <value>]

ARGUMENTS
  OPERATION  (generate|import) operation to perform on keys
  EXTRA      extra argument for the operation

FLAGS
  -c, --context=<value>     [default: default] context for the key
  -f, --force               force operation without prompt
  -p, --passphrase=<value>  passphrase to encrypt the key
  -r, --recovery=<value>    recovery phrase to recover the key
  -v, --version=<value>     [default: 1] version for the key
  -w, --words=<value>       [default: 24] number of words for recovery phrase
      --raw                 output raw key without any formatting

DESCRIPTION
  describe the command here

ALIASES
  $ xgsd keys

EXAMPLES
  $ xgsd config keys
```

_See code: [src/commands/config/keys.ts](https://github.com/xgsd/cli/blob/v0.1.0-alpha.1/src/commands/config/keys.ts)_

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

_See code: [src/commands/hello/index.ts](https://github.com/xgsd/cli/blob/v0.1.0-alpha.1/src/commands/hello/index.ts)_

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

_See code: [src/commands/hello/world.ts](https://github.com/xgsd/cli/blob/v0.1.0-alpha.1/src/commands/hello/world.ts)_

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

## `xgsd hook register HOOK`

describe the command here

```
USAGE
  $ xgsd hook register HOOK [-f]

ARGUMENTS
  HOOK  function to run

FLAGS
  -f, --force

DESCRIPTION
  describe the command here

EXAMPLES
  $ xgsd hook register
```

_See code: [src/commands/hook/register.ts](https://github.com/xgsd/cli/blob/v0.1.0-alpha.1/src/commands/hook/register.ts)_

## `xgsd keys [OPERATION] [EXTRA]`

describe the command here

```
USAGE
  $ xgsd keys [OPERATION] [EXTRA] [-f] [--raw] [-p <value>] [-r <value>] [-w <value>] [-c <value>] [-v
    <value>]

ARGUMENTS
  OPERATION  (generate|import) operation to perform on keys
  EXTRA      extra argument for the operation

FLAGS
  -c, --context=<value>     [default: default] context for the key
  -f, --force               force operation without prompt
  -p, --passphrase=<value>  passphrase to encrypt the key
  -r, --recovery=<value>    recovery phrase to recover the key
  -v, --version=<value>     [default: 1] version for the key
  -w, --words=<value>       [default: 24] number of words for recovery phrase
      --raw                 output raw key without any formatting

DESCRIPTION
  describe the command here

ALIASES
  $ xgsd keys

EXAMPLES
  $ xgsd keys
```

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

## `xgsd run FUNCTION`

describe the command here

```
USAGE
  $ xgsd run FUNCTION [--json] [-f] [-n <value>] [-d <value>] [-w] [-l info|status|warn|error|success...]

ARGUMENTS
  FUNCTION  function to run

FLAGS
  -d, --data=<value>           data file to use (must be a path)
  -f, --force
  -l, --log-level=<option>...  [default: info,status,warn,error,success] log level
                               <options: info|status|warn|error|success>
  -n, --name=<value>           name to print
  -w, --watch                  watch for changes (streams logs to console)

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  describe the command here

EXAMPLES
  $ xgsd run
```

_See code: [src/commands/run.ts](https://github.com/xgsd/cli/blob/v0.1.0-alpha.1/src/commands/run.ts)_

## `xgsd validate`

describe the command here

```
USAGE
  $ xgsd validate [-f] [-y <value>]

FLAGS
  -f, --force
  -y, --yml=<value>  YAML file to validate

DESCRIPTION
  describe the command here

EXAMPLES
  $ xgsd validate
```

_See code: [src/commands/validate.ts](https://github.com/xgsd/cli/blob/v0.1.0-alpha.1/src/commands/validate.ts)_
<!-- commandsstop -->
