# `@xgsd/cli`

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)  
[![Version](https://img.shields.io/npm/v/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)  
[![Downloads/week](https://img.shields.io/npm/dw/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)  
[![CI & Release](https://github.com/Isolated-/xgsd-cli/actions/workflows/release.yml/badge.svg)](https://github.com/Isolated-/xgsd-cli/actions/workflows/release.yml)

## Overview

xGSD is a runtime for your Node.js functions that removes the usual glue code.

You write small functions, xGSD handles the rest — so you can focus on logic instead of wiring everything together.

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

## Install

Use NPM to install xGSD globally:

```bash
npm install -g @xgsd/cli
```

## Quickstart

Create a `index.js` with your block (pure function):

```javascript
// index.js
export async function greet({name}) {
  return {message: `Hello ${name}`}
}
```

And then call it:

```bash
xgsd call greet -d '{"name": "world"}'
```

Output:

```bash
{
  "message": "Hello world"
}
```

Check the [**Documentation**](https://isolated-.github.io/xgsd-userdocs/) to learn more.

## Related repos

- [`@xgsd/runtime`](https://github.com/Isolated-/xgsd-runtime) - all logic required to orchestrate and execute blocks.
- [`@xgsd/engine`](https://github.com/Isolated-/xgsd-engine) - provides a pure abstraction for executing promises in sequence and with concurrency

## Commands

<!-- commands -->

- [`xgsd call BLOCK`](#xgsd-call-block)
- [`xgsd help [COMMAND]`](#xgsd-help-command)
- [`xgsd run`](#xgsd-run)
- [`xgsd version`](#xgsd-version)

## `xgsd call BLOCK`

describe the command here

```
USAGE
  $ xgsd call BLOCK [--json] [-d <value>] [-e <value>] [--dev] [--retries <value>] [--timeout <value>]

ARGUMENTS
  BLOCK  the block/function to test

FLAGS
  -d, --data=<value>
  -e, --entry=<value>    [default: index.js] the entry point to your project
  --dev
      --retries=<value>  [default: 3]
      --timeout=<value>  [default: 1000]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  describe the command here

EXAMPLES
  $ xgsd call
```

_See code: [src/commands/call.ts](https://github.com/Isolated-/xgsd-cli/blob/v0.5.0/src/commands/call.ts)_

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

## Metrics

Fully anonymous performance data is collected to improve xGSD and understand how it's used.

### What's collected

We collect:

```json
{
  "kind": "execution",
  "mode": "async",
  "activation": "http",
  "concurrency": 4,
  "state": "completed",
  "duration": 15066,
  "payloadSize": 14394,
  "runtime": "0.1.0",
  "blockCount": 2,
  "blockFailureRate": 0.5
}
```

For transparency, you can view a copy of what's sent in `{project}/exports/metrics.jsonl`.

### Disable collection

To disable metrics via the CLI:

```bash
xgsd run --no-metrics
```

Via config:

```bash
metrics:
  enabled: false
```

### View the code

All code related to this is inside `src/plugins/metrics.plugin.ts`.
