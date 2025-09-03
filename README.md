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

xGSD only supports **Node.js**, you'll need to ensure it's installed before you continue.

## Install

Installing the CLI is straightforward. Just make sure you already have **NPM** (or **Yarn**) installed.

```bash
# install with npm
npm install -g @xgsd/cli
```

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

# three modes: async|fanout|chained (see Modes)
mode: chained

# applies to all steps without their own options
options:
  timeout: 5s # or 5000
  retries: 3
  backoff: linear # <- this is coming in v0.3.1

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
      latitude: ${{ .output[0].lat }}
      longitude: ${{ .output[0].lon }}
    # apply options at step level too
    options:
      timeout: 15s
      retries: 25
  - name: Get Weather Data
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

It's worth noting that regardless of the mode used, you'll get full process isolation at the workflow level and individual steps. _Most_ blocking tasks that would typically stall Node.js shouldn't, with the exception of `while (true) {}`. I'm working on a solution for this.

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

## Privacy & Security

Most of the features in this project are a response to the UK’s regulatory changes and are designed to mitigate the threats posed by the **Online Safety Act (OSA)**, **Investigatory Powers Act (IPA)**, and the proposed **Chat Control**.

A full security overview will be published once everything is up and running. Please feel free to check the code ([here](https://github.com/Isolated-/xgsd-cli)) if you're concerned about how your data is managed.

In short:

**We do not and will not support weakening of encryption, state-owned backdoors, or any form of violating our users' right to privacy.**

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
@xgsd/cli/0.3.0 linux-x64 node-v24.4.1
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
- [`xgsd run FUNCTION`](#xgsd-run-function)

## `xgsd exec PACKAGE`

Run a workflow in a Docker container (proof of concept, very limited)

```
USAGE
  $ xgsd exec PACKAGE [-y] [-w]

ARGUMENTS
  PACKAGE  package to run

FLAGS
  -w, --watch    watch for changes (streams logs to console)
  -y, --confirm  confirm before running

DESCRIPTION
  Run a workflow in a Docker container (proof of concept, very limited)

EXAMPLES
  $ xgsd exec
```

_See code: [src/commands/exec.ts](https://github.com/xgsd/cli/blob/v0.3.0/src/commands/exec.ts)_

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

## `xgsd run FUNCTION`

Run workflows and your code with full confidence. Error handling, retries, timeouts, and isolation - all built in.

```
USAGE
  $ xgsd run FUNCTION [--json] [-f] [-n <value>] [-d <value>] [-w] [-l info|status|warn|error|success...]
    [-e <value>] [-p]

ARGUMENTS
  FUNCTION  function to run

FLAGS
  -d, --data=<value>           data file to use (must be a path)
  -e, --workflow=<value>       you can specify a workflow by name when you have a workflows/ folder in our NPM package
  -f, --force
  -l, --log-level=<option>...  [default: info,status,warn,error,success] log level
                               <options: info|status|warn|error|success>
  -n, --name=<value>           name to print
  -p, --plain                  run in plain mode (no colours)
  -w, --watch                  watch for changes (streams logs to console)

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Run workflows and your code with full confidence. Error handling, retries, timeouts, and isolation - all built in.

EXAMPLES
  $ xgsd run
```

_See code: [src/commands/run.ts](https://github.com/xgsd/cli/blob/v0.3.0/src/commands/run.ts)_

<!-- commandsstop -->
