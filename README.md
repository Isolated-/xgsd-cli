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

### Quickstart

Create a new project:

```bash
xgsd new my-project
cd my-project
```

Your project contains an `index.js` file with an exported function: `greet`.

You can call `greet` with:

```bash
xgsd call greet -d '{"name": "World"}'
```

Which will output:

```json
{
  "message": "Hello World!"
}
```

You can also run this as a project with `xgsd run`:

```bash
xgsd run -d '{"name": "World"}'
```

Check the result file under `{project}/runs`.

Check the [**Documentation**](https://isolated-.github.io/xgsd-userdocs/) to learn more.

## Related repos

- [`@xgsd/runtime`](https://github.com/Isolated-/xgsd-runtime) - all logic required to orchestrate and execute blocks.
- [`@xgsd/engine`](https://github.com/Isolated-/xgsd-engine) - provides a pure abstraction for executing promises in sequence and with concurrency

## Commands

<!-- commands -->

- [`xgsd call BLOCK`](#xgsd-call-block)
- [`xgsd down`](#xgsd-down)
- [`xgsd help [COMMAND]`](#xgsd-help-command)
- [`xgsd run`](#xgsd-run)
- [`xgsd server down`](#xgsd-server-down)
- [`xgsd server start`](#xgsd-server-start)
- [`xgsd server status`](#xgsd-server-status)
- [`xgsd server stop`](#xgsd-server-stop)
- [`xgsd server up`](#xgsd-server-up)
- [`xgsd start`](#xgsd-start)
- [`xgsd status`](#xgsd-status)
- [`xgsd stop`](#xgsd-stop)
- [`xgsd up`](#xgsd-up)
- [`xgsd version`](#xgsd-version)

## `xgsd call BLOCK`

call a function without running your project (ideal for testing/development)

```
USAGE
  $ xgsd call BLOCK [--json] [-d <value>] [--metrics] [-e <value>] [--dev] [--retries <value>] [--timeout
    <value>]

ARGUMENTS
  BLOCK  the block/function to test

FLAGS
  -d, --data=<value>
  -e, --entry=<value>    [default: index.js] the entry point to your project
  --dev
      --[no-]metrics     sends anonymous metrics to xGSD (everything sent logs to {project}/exports/exports.jsonl).
      --retries=<value>  [default: 3]
      --timeout=<value>  [default: 1000]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  call a function without running your project (ideal for testing/development)

EXAMPLES
  $ xgsd call
```

_See code: [src/commands/call.ts](https://github.com/Isolated-/xgsd-cli/blob/v0.5.0/src/commands/call.ts)_

## `xgsd down`

stops server running in the background (if exists)

```
USAGE
  $ xgsd down [--pid <value>] [-f]

FLAGS
  -f, --force
      --pid=<value>  provide a process ID vs resolving it (useful for hanging background services)

DESCRIPTION
  stops server running in the background (if exists)

ALIASES
  $ xgsd down
  $ xgsd stop
  $ xgsd server stop

EXAMPLES
  $ xgsd down
```

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

run your xGSD project

```
USAGE
  $ xgsd run [--json] [-d <value>] [--metrics] [-e <value>] [-d] [-l] [-c <value>] [-s] [-p <value>]

FLAGS
  -c, --config=<value>  [default: config.yaml] path to your configuration file (defaults to config.yaml)
  -d, --data=<value>
  -d, --debug           verbose debug information is printed when this option is used.
  -e, --entry=<value>   [default: index.js] the entry point to your project
  -l, --local           --lite has been replaced by this option. Uses no process isolation for faster runs
  -p, --path=<value>    path to your project (will override config path + entry)
  -s, --[no-]save       when false/--no-save is used, no report will be saved to runs/{date}.json
      --[no-]metrics    sends anonymous metrics to xGSD (everything sent logs to {project}/exports/exports.jsonl).

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  run your xGSD project

EXAMPLES
  $ xgsd run
```

_See code: [src/commands/run.ts](https://github.com/Isolated-/xgsd-cli/blob/v0.5.0/src/commands/run.ts)_

## `xgsd server down`

stops server running in the background (if exists)

```
USAGE
  $ xgsd server down [--pid <value>] [-f]

FLAGS
  -f, --force
      --pid=<value>  provide a process ID vs resolving it (useful for hanging background services)

DESCRIPTION
  stops server running in the background (if exists)

ALIASES
  $ xgsd down
  $ xgsd stop
  $ xgsd server stop

EXAMPLES
  $ xgsd server down
```

_See code: [src/commands/server/down.ts](https://github.com/Isolated-/xgsd-cli/blob/v0.5.0/src/commands/server/down.ts)_

## `xgsd server start`

starts the background service to enable execution of your project via HTTP (experimental)

```
USAGE
  $ xgsd server start [-d] [-f] [-p <value>] [-h <value>] [-a] [-t <value>] [--cwd <value>]

FLAGS
  -a, --[no-]auth      when true, authentication is required (Bearer token) - use --no-auth to override this
  -d, --detached       runs the API in the background
  -f, --force          when process is already running, --force will kill the running process and start a new one
  -h, --host=<value>   [default: localhost] ip/hostname for incoming connections
  -p, --port=<value>   [default: 3010] port for incoming connections
  -t, --token=<value>  [default: 334179cf-250b-41a8-bbb7-66e3dfa665d9] (recommended) leave this empty to generate a
                       random token
      --cwd=<value>    ideal if your projects are in the same directory

DESCRIPTION
  starts the background service to enable execution of your project via HTTP (experimental)

ALIASES
  $ xgsd start
  $ xgsd up
  $ xgsd server start

EXAMPLES
  $ xgsd server start
```

## `xgsd server status`

query server/process status (up/down + run count + uptime)

```
USAGE
  $ xgsd server status -u <value>

FLAGS
  -u, --url=<value>  (required) [default: http://localhost:3010/info] full url to /info endpoint

DESCRIPTION
  query server/process status (up/down + run count + uptime)

ALIASES
  $ xgsd status
  $ xgsd server status

EXAMPLES
  $ xgsd server status
```

_See code: [src/commands/server/status.ts](https://github.com/Isolated-/xgsd-cli/blob/v0.5.0/src/commands/server/status.ts)_

## `xgsd server stop`

stops server running in the background (if exists)

```
USAGE
  $ xgsd server stop [--pid <value>] [-f]

FLAGS
  -f, --force
      --pid=<value>  provide a process ID vs resolving it (useful for hanging background services)

DESCRIPTION
  stops server running in the background (if exists)

ALIASES
  $ xgsd down
  $ xgsd stop
  $ xgsd server stop

EXAMPLES
  $ xgsd server stop
```

## `xgsd server up`

starts the background service to enable execution of your project via HTTP (experimental)

```
USAGE
  $ xgsd server up [-d] [-f] [-p <value>] [-h <value>] [-a] [-t <value>] [--cwd <value>]

FLAGS
  -a, --[no-]auth      when true, authentication is required (Bearer token) - use --no-auth to override this
  -d, --detached       runs the API in the background
  -f, --force          when process is already running, --force will kill the running process and start a new one
  -h, --host=<value>   [default: localhost] ip/hostname for incoming connections
  -p, --port=<value>   [default: 3010] port for incoming connections
  -t, --token=<value>  [default: 334179cf-250b-41a8-bbb7-66e3dfa665d9] (recommended) leave this empty to generate a
                       random token
      --cwd=<value>    ideal if your projects are in the same directory

DESCRIPTION
  starts the background service to enable execution of your project via HTTP (experimental)

ALIASES
  $ xgsd start
  $ xgsd up
  $ xgsd server start

EXAMPLES
  $ xgsd server up
```

_See code: [src/commands/server/up.ts](https://github.com/Isolated-/xgsd-cli/blob/v0.5.0/src/commands/server/up.ts)_

## `xgsd start`

starts the background service to enable execution of your project via HTTP (experimental)

```
USAGE
  $ xgsd start [-d] [-f] [-p <value>] [-h <value>] [-a] [-t <value>] [--cwd <value>]

FLAGS
  -a, --[no-]auth      when true, authentication is required (Bearer token) - use --no-auth to override this
  -d, --detached       runs the API in the background
  -f, --force          when process is already running, --force will kill the running process and start a new one
  -h, --host=<value>   [default: localhost] ip/hostname for incoming connections
  -p, --port=<value>   [default: 3010] port for incoming connections
  -t, --token=<value>  [default: 334179cf-250b-41a8-bbb7-66e3dfa665d9] (recommended) leave this empty to generate a
                       random token
      --cwd=<value>    ideal if your projects are in the same directory

DESCRIPTION
  starts the background service to enable execution of your project via HTTP (experimental)

ALIASES
  $ xgsd start
  $ xgsd up
  $ xgsd server start

EXAMPLES
  $ xgsd start
```

## `xgsd status`

query server/process status (up/down + run count + uptime)

```
USAGE
  $ xgsd status -u <value>

FLAGS
  -u, --url=<value>  (required) [default: http://localhost:3010/info] full url to /info endpoint

DESCRIPTION
  query server/process status (up/down + run count + uptime)

ALIASES
  $ xgsd status
  $ xgsd server status

EXAMPLES
  $ xgsd status
```

## `xgsd stop`

stops server running in the background (if exists)

```
USAGE
  $ xgsd stop [--pid <value>] [-f]

FLAGS
  -f, --force
      --pid=<value>  provide a process ID vs resolving it (useful for hanging background services)

DESCRIPTION
  stops server running in the background (if exists)

ALIASES
  $ xgsd down
  $ xgsd stop
  $ xgsd server stop

EXAMPLES
  $ xgsd stop
```

## `xgsd up`

starts the background service to enable execution of your project via HTTP (experimental)

```
USAGE
  $ xgsd up [-d] [-f] [-p <value>] [-h <value>] [-a] [-t <value>] [--cwd <value>]

FLAGS
  -a, --[no-]auth      when true, authentication is required (Bearer token) - use --no-auth to override this
  -d, --detached       runs the API in the background
  -f, --force          when process is already running, --force will kill the running process and start a new one
  -h, --host=<value>   [default: localhost] ip/hostname for incoming connections
  -p, --port=<value>   [default: 3010] port for incoming connections
  -t, --token=<value>  [default: 334179cf-250b-41a8-bbb7-66e3dfa665d9] (recommended) leave this empty to generate a
                       random token
      --cwd=<value>    ideal if your projects are in the same directory

DESCRIPTION
  starts the background service to enable execution of your project via HTTP (experimental)

ALIASES
  $ xgsd start
  $ xgsd up
  $ xgsd server start

EXAMPLES
  $ xgsd up
```

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
