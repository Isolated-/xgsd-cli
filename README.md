# `@xgsd/cli`

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)  
[![Version](https://img.shields.io/npm/v/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)  
[![Downloads/week](https://img.shields.io/npm/dw/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)  
[![CI & Release](https://github.com/Isolated-/xgsd-cli/actions/workflows/release.yml/badge.svg)](https://github.com/Isolated-/xgsd-cli/actions/workflows/release.yml)

xGSD is a runtime for your Node.js functions so you can think less about application design and more about logic. Perfect for when you just want to get stuff done without writing all the glue code.

### Before xGSD

```javascript
async function fetchUserProfile(userId) {
  try {
    const response = await axios.get(`https://api.example.com/users/${userId}`, {
      timeout: 5000,
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    })

    const user = response.data

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      lastLogin: user.last_login,
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error.message)
    throw error
  }
}
```

### After xGSD

```javascript
async function fetchUserProfile({userId}) {
  const {data} = await axios.get(`https://api.example.com/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.API_TOKEN}`,
    },
  })

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    lastLogin: data.last_login,
  }
}
```

Why re-invent the wheel each time you create a new project when you can use xGSD?

## Install

Use NPM to install xGSD globally:

```bash
npm install -g @xgsd/cli
```

## Getting started

## Documentation

Learn about xGSD and how to use it for your next project at [TBD](#).

## Upgrade from v0.4

`v0.5` is a complete redesign of xGSD to make it more extensible and less restrictive. The core of xGSD remains mostly untouched but you will need to change some or all of your project code.

Some of the changes:

- **Plugin system** added allowing you to override default behaviour of xGSD
- **Helper system** replaced with templating for consistency
- **Custom orchestrators and executors** enable complete override of how the runtime works
- **Configuration** simplified to avoid confusion and ensure runs are consistent
- **Block testing** allows for blocks/functions to be tested in isolation without a full project run

Future updates will introduce more ways to test blocks and introduce a **Trigger API** for running projects via HTTP.

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes, incompatible API modifications.
- **MINOR** (0.x.0): Backwards-compatible new features and improvements.
- **PATCH** (0.0.x): Backwards-compatible bug fixes or small internal improvements.

Pre-release tags (e.g., `1.2.0-beta.1`) may be used for testing before stable releases.

## Commands

<!-- commands -->
* [`xgsd help [COMMAND]`](#xgsd-help-command)
* [`xgsd run`](#xgsd-run)
* [`xgsd test BLOCK`](#xgsd-test-block)
* [`xgsd version`](#xgsd-version)

## `xgsd help [COMMAND]`

Display help for xgsd.

```
USAGE
  $ xgsd help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for xgsd.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/6.2.44/src/commands/help.ts)_

## `xgsd run`

```
USAGE
  $ xgsd run [--json] [-d <value>] [-e <value>] [-d] [-l] [-c <value>] [-s] [-L]

FLAGS
  -L, --[no-]logs
  -c, --config=<value>  [default: config.yaml] path to your configuration file (defaults to config.yaml)
  -d, --data=<value>
  -d, --debug           verbose debug information is printed when this option is used.
  -e, --entry=<value>   [default: index.js] the entry point to your project
  -l, --local           --lite has been replaced by this option. Uses no process isolation for faster runs
  -s, --[no-]save

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  $ xgsd run
```

_See code: [src/commands/run.ts](https://github.com/Isolated-/xgsd-cli/blob/v0.5.0/src/commands/run.ts)_

## `xgsd test BLOCK`

describe the command here

```
USAGE
  $ xgsd test BLOCK [--json] [-d <value>] [-e <value>]

ARGUMENTS
  BLOCK  the block/function to test

FLAGS
  -d, --data=<value>
  -e, --entry=<value>  [default: index.js] the entry point to your project

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  describe the command here

EXAMPLES
  $ xgsd test
```

_See code: [src/commands/test.ts](https://github.com/Isolated-/xgsd-cli/blob/v0.5.0/src/commands/test.ts)_

## `xgsd version`

```
USAGE
  $ xgsd version [--json] [--verbose]

FLAGS
  --verbose  Show additional information about the CLI.

GLOBAL FLAGS
  --json  Format output as json.

FLAG DESCRIPTIONS
  --verbose  Show additional information about the CLI.

    Additionally shows the architecture, node version, operating system, and versions of plugins that the CLI is using.
```

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/2.2.42/src/commands/version.ts)_
<!-- commandsstop -->
