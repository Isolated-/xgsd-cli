# Workflows with **xGSD CLI**

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)  
[![Version](https://img.shields.io/npm/v/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)  
[![Downloads/week](https://img.shields.io/npm/dw/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)  
[![CI & Release](https://github.com/Isolated-/xgsd-cli/actions/workflows/release.yml/badge.svg)](https://github.com/Isolated-/xgsd-cli/actions/workflows/release.yml)

**xGSD** lets you run workflows (task orchestration) **locally on your machine**.  
If you don’t need the full complexity of cloud solutions like **AWS Lambda**, **GCP Functions**, or **Azure Functions**, xGSD may be the perfect fit.

- **Zero external dependencies** — nothing to install or manage beyond your workflow.
- Define your workflow and **everything else is handled for you**.
- Ideal for **solo developers, tinkerers, or anyone experimenting with automation**.
- Runs on just about **anything**, successfully tested on a Raspberry Pi Zero 2 W running a 32-bit OS.
- **No internet connection** needed.

## Install

xGSD supports a range of operating systems (basically anything UNIX-based). Find the option that's most suitable for you (more documentation will be made available soon).
In `v0.4.0` we dropped support for Windows as a build target. You can continue to use xGSD through NPM, or download WSL and install through the Linux route. This is recommended to ensure xGSD is fully operational.

### Linux

If you're using Ubuntu, Debian, or a similar distro this will probably be your path.

```sh
# install curl if you don't already have it:
sudo apt install -y curl

# then install using our install script:
curl -fsSL https://xgsd-cli.ams3.cdn.digitaloceanspaces.com/install.sh | sh
```

Once installed you can check for updates with:

```sh
# stable
xgsd update

# beta
xgsd update beta
```

### NPM

For _most_ systems, installing through NPM will still work:

```sh
npm install -g @xgsd/cli
```

`xgsd update` doesn't seem to work with NPM though. Install through the **Linux** route if you'd like that functionality.

## Quickstart

Everything is designed so that you can get up and running **quickly** and with minimal frustration.

First, create a directory for your new workflow (xGSD stores logs and results here):

```bash
# make a new directory
mkdir my-workflow

# then run npm/yarn init
npm init
```

Then create your action:

```js
// index.js (must match main in package.json)
const axios = require('axios');
const myHttpAction = (context) => {
    const response = await axios.get(context.url);
    return response.data;
}
```

Create a configuration file in your project folder:

```
touch config.yaml
```

Since _v0.3.0_, you can use **JSON** if you prefer. File extensions `.yaml` or `.yml` doesn't matter either.

A minimal configuration looks like:

```yaml
steps:
  - name: My Http Action
    run: myHttpAction
```

Results will be written to `my-workflow/runs/{name}` unless you disable collection with:

```yaml
# insert this at the top of your config
collect:
  logs: false
  run: false
```

Since _v0.3.0_, you can also print input and output data (off by default):

```yaml
# insert this at the top
print:
  input: true
  output: true
```

And finally run your workflow:

```bash
xgsd run path/to/package --workflow {name} --watch
```

Or, to try the experimental Docker support, replace `run` with `exec` and remove `--workflow`  
(this option isn’t currently supported by `exec`).

Since _v0.3.0_, logs and results are collected by default — see **Configuration** to disable them.

## Are you using xGSD?

xGSD will never collect analytics from your machine, nor does it integrate with any backend services (as of v0.4.6). If you find this project useful, please consider giving it a ⭐ on GitHub. This helps keep me motivated and gives me a clearer sense of how many people xGSD is supporting.

## Watchdog Protection

Everyone’s been there: you forget a `break` in a loop, or a step never returns, and suddenly the whole process is hung forever.  
To save you from that headache, xGSD runs each step under a **watchdog**.

Here’s how it works:

- If a step keeps emitting events (retries, backoff, logs, etc.), it’s considered alive and continues normally.
- If a step goes completely silent — no events, no results, no errors — the watchdog kicks in and **kills the process** with a `hard timeout`.
- This doesn’t interfere with soft timeouts (network delays, retries, backoff) — those are handled as expected.

## Dangling Processes (`< v0.3.3`)

`v0.3.2` fixes a major issue where processes were not exiting correctly if xGSD fails to exit gracefully (e.g. an error occurred before execution of your workflow). You may not have noticed this problem but you should upgrade to `v0.3.2` to prevent this happening. These processes will not exit on their own for sometime and will consume large amounts of memory `< 2GB` in a matter of seconds. `v0.3.2` version was corrupted was it was released as `v0.3.3` with new `env` option at step level.

**Upgrade to `v0.3.3` to avoid this issue.**

## Configuration

In _v0.3.0_, an entirely new way of configuring workflows was introduced.  
You can continue to use `v0.2` names like `action` vs `run` as they are aliased to prevent breaking changes.  
Using `v0.2` and `v0.3` mixed isn't recommended though.

```yaml
# this workflow works with v0.3.0+, ensure you have @xgsd/cli@0.3.1.
# it demonstrates the use of all configuration options/features
# remember that beyond steps[].name and steps[].run, everything is optional.
name: Chained workflow

# description is used in logging, mainly for your use
description: A simple workflow to demonstrate the capabilities of the system.

# recommended
runner: xgsd@v1

# quick enable/disable workflows
enabled: true

# four modes: async|fanout|chained|batched (see Modes)
mode: chained

# v0.3.2 adds these options
logs:
  bucket: 1h # or 1d (more will come)
  path: /home/me/.logs/my-workflow

# applies to all steps without their own options
options:
  timeout: 5s # or 5000
  retries: 3 # min: 1, max:
  backoff: linear # <- this is coming in v0.3.1
  concurrency: 4 # min: 1, max: 32

# a map of anything you like
# this data isn't used at all by xGSD
metadata:
  production: true

# turn off log/run collection (defaults to on in v0.3.0)
collect:
  run: true
  logs: true

# v0.3.0 introduced a way of passing additional data into your workflow
# you can use this in addition to runtime data (xgsd run {package} --data {data}.json)
# all steps receive this data unless you exclude it in `with` or `after` (set it to null/undefined)
# please note data must be an object
data:
  location: 'New York'

# v0.3.0 introduces this option
# used for logging input/output before and after a step
# useful for debugging
print:
  input: true
  output: true

# everything above is optional, steps is the only config needed
# must be an array with atleast `name` and `run` (or `action` if you're on < v0.3.0)
steps:
  - name: Get Location Data # can be anything you like, keep it path safe
    # v0.3.0 introduces this option along with templating
    with:
      city: ${{ .data.location }}
    # run or action = the same thing, depending on which you prefer
    run: getLocationData
    # this is used for transforming the output
    after:
      city: ${{ .data.city }}
      latitude: ${{ .output.data[0].lat }}
      longitude: ${{ .output.data[0].lon }}
    # apply options at step level too
    options:
      timeout: 15s
      retries: 25
  - name: Get Weather Data
    env:
      # v0.3.3 added this option
      MY_ENV_VAR: 'value'
    with:
      city: ${{ .config.data.location }}
      latitude: ${{ steps[0].output.latitude }}
      longitude: ${{ steps[0].output.longitude }}
    run: getWeatherData
    after:
      location: null
      city: ${{ .data.location }}
      temperature: ${{ .output.current_weather.temperature }}
  - name: Create Temperature Message
    run: createTemperatureMessage
    with:
      # here a helper is used (censor)
      # as the name implies, this will censor the city name (replaces with * currently)
      city: ${{ .data.city | censor }}
```

### Modes

If you need a mode introduced please let me know — more modes = more use cases for us to use!

- `async` — this mode is absolutely ideal for when ordering doesn't matter. Each step is executed initially in order but no waiting for results, retries, or timeouts. This mode won't allow one failing step to block your entire workflow.
- `fanout` — this mode and `chained` are very similar and may be confusing for some. The main difference between this mode and `chained` is that in `fanout` the input data is passed to all steps in order. This is ideal for when the result of one step doesn't affect the next.
- `chained` — order is preserved, however, the output from the _last successful step_ is passed into the input of the next step. This chaining allows for complex workflows and maintains order when things go wrong.
- `batched` — _added in `v0.4.2`_. Steps are executed in batches with a fixed concurrency. The batch order is preserved, but the execution order of steps within a batch is not. After each batch completes, its combined output is passed as input to the next batch. This mode is useful when you need to process and aggregate data in groups, where the exact order of individual step execution doesn’t matter, but the batch-level result does.

It's worth noting that regardless of the mode used, you'll get full process isolation at the workflow level and individual steps.

### Concurrency

Concurrency was added in `v0.3.6` and ensures that **async** workflows do not spawn _n_ processes where _n_ is the number of steps in your workflow. Instead, a simple concurrency manager has been added and you can configure it with the `concurrency` option in `options`:

```yaml
options:
  concurrency: 1 - 32 # defaults to 8
```

As of `v0.3.6` this does not affect **chained** or **fanout** mode as they currently run sequentially, this may change in future. Since `v0.4.2` this affects all modes. For sequential modes, **concurrency** is fixed at 1.

### Templating

A simple yet effective templating system was introduced in _v0.3.0_.  
It doesn't rely on any templating libraries, so it may be limited in some areas; however, it's still pretty powerful.  
Later versions will focus on improving the syntax or replacing it entirely.

#### Context

You can reference context properties using the template syntax. The context includes:

- `steps` — all steps that have previously run (may not be useful in `fanout` or `async` modes)
- `config` — original configuration
- `data` — the current step input data
- `output` — the output of the current step

This will be extended between `v0.3.0` and `v0.4.0`.  
To reference these properties using the template syntax `${{ .data.name }}`, you can combine them with helpers like `censor` or `hash` to transform the value before it hits your step.

For example, a configuration like:

```yaml
data:
  name: Sensitive
steps:
  - name: Use Name and Hash
    run: useNameAndHash
    after:
      name: ${{ .data.name | censor }}
```

Would ensure that the next step will only see `{ name: "*********" }`.  
Alternatively, you can set it to `null`, `undefined`, or any other value you need.

### Helpers

You can chain helpers (`|`) in order; **order matters** (e.g., `json | hash | slice(0,8)` is different from `hash | json`).

> **Remember:**
>
> - Always start with **an input**: a number (`15`), a string (`"hello"`), or a path (`.input.user.name`).
> - For string arguments, use **double quotes**: `"number"`, `"world"`.
> - Passing arrays/objects as _inline literals_ isn’t supported as the **first input** — use a path instead (e.g., `.input.items`).
> - Helpers that conceptually need no input (e.g., `uuid`, `now`) can be called with `""` as the input: `{{ "" | uuid }}`.

#### Compare

- `gt` – **Usage**: `{{ 15 | gt(20) }} → false`
- `gte` – **Usage**: `{{ 15 | gte(20) }} → false`
- `lt` – **Usage**: `{{ 15 | lt(20) }} → true`
- `lte` – **Usage**: `{{ 15 | lte(15) }} → true`
- `eq` – **Usage**: `{{ 15 | eq(15) }} → true`
- `neq` – **Usage**: `{{ 15 | neq(15) }} → false`
- `type` – **Usage**: `{{ 15 | type("number") }} → true`
- `!empty` – **Usage**: `{{ "" | !empty }} → false`
- `!null` – **Usage**: `{{ null | !null }} → false`

#### Numbers

- `add` – **Usage**: `{{ 15 | add(5) }} → 20`
- `sub` – **Usage**: `{{ 15 | sub(5) }} → 10`
- `mul` – **Usage**: `{{ 15 | mul(2) }} → 30`
- `div` – **Usage**: `{{ 15 | div(3) }} → 5`

#### Strings

- `upper` – **Usage**: `{{ "hello" | upper }} → "HELLO"`
- `lower` – **Usage**: `{{ "HELLO" | lower }} → "hello"`
- `trim` – **Usage**: `{{ "  hello  " | trim }} → "hello"`
- `hash` – **Usage**: `{{ "mypassword" | hash }} → "34819d7beeab…"` _(sha256 hex)_
- `censor` – **Usage**: `{{ "secret" | censor }} → "******"`
- `truncate` – **Usage**: `{{ "abcdefghijklmnop" | truncate(3,3) }} → "abc...nop"`
- `replace` – **Usage**: `{{ "hello world" | replace("world","user") }} → "hello user"`
- `length` – **Usage**: `{{ "hello" | length }} → 5`
- `slice` – **Usage**: `{{ "hello" | slice(1,3) }} → "el"`
- `json` – _Stringify or parse_:
  - Stringify object from context: `{{ .input.user | json }} → "{\"name\":\"Alice\"}"`
  - Parse string JSON from context: `{{ .input.rawJson | json }}` → _(returns an object in the pipeline)_

#### Objects

- `json` – **Usage**: `{{ .input.user | json }} → "{\"name\":\"Alice\"}"`
- `merge` – **Usage**: `{{ .input.user | merge(.input.patch) }} → {…merged object…}`  
  _(Use a context path for the second arg; inline object literals aren’t supported as args.)_

#### Arrays

- `slice` – **Usage**: `{{ .input.items | slice(1,3) }} → [item2,item3]`
- `length` – **Usage**: `{{ .input.items | length }} → 3`
- `concat` – **Usage**: `{{ .input.items | concat(.input.moreItems) }} → [ …combined… ]`

#### Utility

- `uuid` – **Usage**: `{{ "" | uuid }} → "3fa85f64-5717-4562-b3fc-2c963f66afa6"`
- `now` – **Usage**: `{{ "" | now }} → "2025-09-02T18:55:00.123Z"`
- `default` – **Usage**: `{{ null | default("fallback") }} → "fallback"`
- `concat` (strings/arrays) – **Usage**:
  - Strings: `{{ "hello" | concat(", world") }} → "hello, world"`
  - Arrays: `{{ .input.a | concat(.input.b) }} → [ … ]`
- `length` – _(works for strings/arrays/objects)_:
  - `{{ .input.obj | length }} → 3` _(counts keys)_

#### Chaining examples

- Email fingerprint:  
  `{{ .input.user.email | lower | hash | slice(0,8) }}` → `"a1b2c3d4"`
- Compact user blob:  
  `{{ .input.user | json | hash | truncate(6,4) }}` → `"1fa2b3...9c0d"`

## Support

If you're struggling with this CLI, want to give feedback, need changes to enable your workflow, or anything else, shoot me an email at [**mike@xgsd.io**](mailto:mike@xgsd.io). I’ll try to help wherever I can.

If you want to make changes to xGSD, feel free to make a pull request [**do that here**](https://github.com/Isolated-/xgsd-cli).

No analytic data is, or will be, collected from your machine. Please feel free to reach out with suggestions, criticism, or just to let me know what you're using this for.

## Stability

**xGSD isn’t fragile — it’s just immature.**

xGSD is steadily moving toward production stability, but it’s still an **early-stage project** (`< v1.0.0`).  
That means you should expect the occasional **bug, missing feature, or breaking change** along the way.

It’s built and maintained by a **solo developer** — I’ll give it 100%, but sometimes things slip through.  
For example, in `v0.3.0` I reworked the process handler and (oops) forgot to re-implement async mode 🙃.  
I wish I’d never make mistakes, but they’re part of the process — and when they happen, I **fix them fast**.  
(`v0.3.1` patched the async mode issue right after release.)

If your workflow is **mission-critical**, you may want to wait until later versions.  
But if you’re a **solo operator, tinkerer, or just curious**, _this is exactly the right time to jump in_.  
Run xGSD on a Raspberry Pi as your own **serverless platform without vendor lock-in**, orchestrate your personal stack, or hack together new workflows — and please share feedback when you hit an edge case. **That’s how xGSD gets better.**

If you’ve been down the frustrating road of debugging **brittle cloud jobs** — wiring retries, catching every edge case, and making sure nothing silently fails — you’ll feel right at home here.  
xGSD is built to take that pain away, so you can **focus on building things that matter instead of babysitting error handlers.**

## Inspiration

Over the last five years, I’ve been working toward developing flexible code that is on-par with industry standards and current trends. My goal was to enable **custom user code** to run without modification to my own code. A lot of trial and error went into a seemingly simple solution.

Whilst no single tool directly led to the solution, a lot of inspiration has come from:

- **GitHub Actions**
- **AWS Lambda** and other cloud alternatives
- **RxJS**, **Nest.js**, and other JavaScript frameworks/libraries

You’ll see this influence in various forms—from configuration to isolation. I would’ve been lost without these tools available to reverse engineer.

## Changes & Versioning

Changes aren't currently recorded — they will be soon and managed in `CHANGELOG.md`. For now, here's what's new in **v0.3.0**:

- **Docker support** has been added in experimental state. Feel free to try it with `xgsd exec {normal run args}`. Consider this _unstable_ until `v0.4.0+`.
- **Configuration templating syntax** has been added, in addition to `with`, `if`, `after` at the step level. All options support template syntax.
- **Multiple workflows** can now be added. Simply remove your `config.yml` and place workflow configurations in a `workflows/` folder in your package. Then run your workflow with `xgsd run {package} --workflow {name}`.
- **Streamlined logging & reporting** — some logging has been removed and reports have been reduced for easier human reading.

`v0.3.x` will continue to expand the templating syntax, stabilize Docker support, and introduce any missing configuration options. Feel free to suggest improvements or make changes (see **Support**).

### Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes, incompatible API modifications.
- **MINOR** (0.x.0): Backwards-compatible new features and improvements.
- **PATCH** (0.0.x): Backwards-compatible bug fixes or small internal improvements.

Pre-release tags (e.g., `1.2.0-beta.1`) may be used for testing before stable releases.

## CLI

### Usage

<!-- usage -->

```sh-session
$ npm install -g @xgsd/cli
$ xgsd COMMAND
running command...
$ xgsd (--version)
@xgsd/cli/0.4.0 linux-arm node-v20.19.5
$ xgsd --help [COMMAND]
USAGE
  $ xgsd COMMAND
...
```

<!-- usagestop -->

### Commands

<!-- commands -->

- [`xgsd exec PACKAGE`](#xgsd-exec-package)
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
- [`xgsd run FUNCTION`](#xgsd-run-function)
- [`xgsd update [CHANNEL]`](#xgsd-update-channel)
- [`xgsd version`](#xgsd-version)

## `xgsd exec PACKAGE`

Run a workflow in a Docker container (proof of concept, very limited). Container is removed after exec for each run.

```
USAGE
  $ xgsd exec PACKAGE [-y] [-w] [-e <value>]

ARGUMENTS
  PACKAGE  package to run

FLAGS
  -e, --workflow=<value>  workflow to run
  -w, --watch             watch for changes (streams logs to console)
  -y, --confirm           confirm before running

DESCRIPTION
  Run a workflow in a Docker container (proof of concept, very limited). Container is removed after exec for each run.

EXAMPLES
  $ xgsd exec
```

_See code: [src/commands/exec.ts](https://github.com/xgsd/cli/blob/v0.4.0/src/commands/exec.ts)_

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

## `xgsd run FUNCTION`

Run workflows and your code with full confidence. Error handling, retries, timeouts, and isolation - all built in.

```
USAGE
  $ xgsd run FUNCTION [--json] [--force] [-w] [-l info|user|status|success|retry|warn|error...] [-e
    <value>] [-p] [-d <value>] [-c <value>]

ARGUMENTS
  FUNCTION  function to run

FLAGS
  -c, --concurrency=<value>  [default: 8] maximum number of concurrent processes (only for async mode)
  -d, --data=<value>         data file to use (must be a path)
  -e, --workflow=<value>     you can specify a workflow by name when you have a workflows/ folder in your NPM package
  -l, --level=<option>...    [default: info,user,status,success,retry,warn,error] the level of log to output (must be
                             used with --watch), CSV
                             <options: info|user|status|success|retry|warn|error>
  -p, --plain                run in plain mode (no colours)
  -w, --watch                watch for changes (streams logs to console from containers/processes/etc), wont impact logs
                             written to disk
      --force                force the action to complete (not recommended)

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Run workflows and your code with full confidence. Error handling, retries, timeouts, and isolation - all built in.

EXAMPLES
  $ xgsd run
```

_See code: [src/commands/run.ts](https://github.com/xgsd/cli/blob/v0.4.0/src/commands/run.ts)_

## `xgsd update [CHANNEL]`

update the xgsd CLI

```
USAGE
  $ xgsd update [CHANNEL] [--force |  | [-a | -v <value> | -i]] [-b ]

FLAGS
  -a, --available        See available versions.
  -b, --verbose          Show more details about the available versions.
  -i, --interactive      Interactively select version to install. This is ignored if a channel is provided.
  -v, --version=<value>  Install a specific version.
      --force            Force a re-download of the requested version.

DESCRIPTION
  update the xgsd CLI

EXAMPLES
  Update to the stable channel:

    $ xgsd update stable

  Update to a specific version:

    $ xgsd update --version 1.0.0

  Interactively select version:

    $ xgsd update --interactive

  See available versions:

    $ xgsd update --available
```

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v4.7.4/src/commands/update.ts)_

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

_See code: [@oclif/plugin-version](https://github.com/oclif/plugin-version/blob/v2.2.32/src/commands/version.ts)_

<!-- commandsstop -->
