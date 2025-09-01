# Local Task Orchestration with xGSD CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@xgsd/cli.svg)](https://npmjs.org/package/@xgsd/cli)
[![tests](https://github.com/Isolated-/xgsd-cli/actions/workflows/test.yml/badge.svg)](https://github.com/Isolated-/xgsd-cli/actions/workflows/test.yml)

Built for solos, xGSD is local task orchestration (and soon) built on top of a secure storage system that integrates with whatever storage solution you want/need. If you don't need the complexity (and power) of a cloud solution, xGSD may be for you. No dependencies, or anything to manage just define your pipeline and everything else is taken care of.

_Please note this is a work in progress, expect some ugly errors here and there but please report any that you find outside of your pipeline - this allows me to make xGSD better for everyone. See **Support** for details_.

This project will slowly evolve into a full suite of tools for solos, from task orchestration to goal planning with AI that works, xGSD will be here to take the boring work away and leave you with the fun bits.

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

Once you've done that you're ready to start building with xGSD.

## Quickstart

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

# can be async, fanout or chained
# async is perfect when the ordering doesn't matter
# use fanout when ordering matters but output isn't needed downstream
# output of last successful step is fed into the input of the next with chained
mode: chained

# store logs and result
# currently these are stored in your package
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
}
```

And finally run your pipeline with `$ xgsd run path/to/module -d path/to/data.json -w`. More documentation will be available soon, if you find any problems let me know (see **Support**). Here's an example of what this quickstart should log:

```
(status) My First Pipeline (1.0.0) is running using runner "xgsd@v1" in async mode, timeout: 5000ms, retries: 3.
(status) Uppercase Data - converts the input data to uppercase is running using xgsd@v1, timeout: 5000ms, retries: 3
(status) Fetch Some API Data - get some data from httpbin.org is running using xgsd@v1, timeout: 5000ms, retries: 3
(status) Hash Data - hashes the input data is running using xgsd@v1, timeout: 5000ms, retries: 3
(status) Hash Data - executing step
(success) Hash Data - step completed successfully in 0 attempts
(status) Uppercase Data - executing step
(success) Uppercase Data - step completed successfully in 0 attempts
(status) Fetch Some API Data - executing step
(warn) Fetch Some API Data - retry attempt 1/3, next retry in 1s, error: Timeout
(warn) Fetch Some API Data - retry attempt 2/3, next retry in 2s, error: Timeout
(success) Fetch Some API Data - step completed successfully in 2 attempts
(info) the run id for My First Pipeline is 996e0a16-7bac-4804-9072-e7ea9f202981
(info) logs and results if collected will be saved to /home/you/pipeine/runs/my-first-pipeline
(info) the duration in your report may be slightly different to below
(status) executed 3 steps, 3 succeeded and 0 failed, duration: 5.64s
```

The run result will be available providing `collect.run = true`, it's too long to include is this section but it includes everything you need to know about what happened, what went wrong, and how it was handled. Everything has been designed so you can focus on business logic, and xGSD will manage ensuring it works.

## Use Cases

xGSD is flexible and isn't designed for a specific use case, it's designed for solo developers and getting stuff done. That said, here's some ideas/what we use it for:

- **Storage** - when secure storage is available, a lot of the processing work will be offloaded to internal pipelines.
- **Home orchestration** - using Lambda for home-based IoT? This could be a viable (and free) alternative.
- **Data transformation pipelines** – quick way to build ETL-style jobs (e.g. clean → transform → export).
- **API glue** – chain together external APIs without needing a full backend service.
- **Prototyping automations** – test an idea locally in hours instead of spinning up infra in AWS/GCP.
- **CI/CD experiments** – run ad-hoc build/test/deploy sequences without a full CI service.
- **Research workflows** – automate repetitive fetch → parse → store tasks when working with APIs, datasets, or scraping.
- **Developer utilities** – wrap up personal scripts (formatting, linting, packaging, etc.) into a pipeline that’s easier to re-run.
- **Scheduled jobs** – cron-like pipelines to perform regular maintenance or reporting.
- **Offline-first automation** – run workflows without cloud dependencies (useful in privacy-conscious setups).

I would love to know what you end up using it for!

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

## Commands

- [`xgsd help [COMMAND]`](#xgsd-help-command)
- [`xgsd run FUNCTION`](#xgsd-run-function)

### `$ xgsd help [COMMAND]`

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

### `$ xgsd run FUNCTION`

Run pipelines that you've created with error handling, retries, timeouts, isolation, and more.

```
USAGE
  $ xgsd run FUNCTION [--json] [-f] [-n <value>] [-d <value>] [-w] [-l info|status|warn|error|success...]
    [-p]

ARGUMENTS
  FUNCTION  function to run

FLAGS
  -d, --data=<value>           data file to use (must be a path)
  -f, --force
  -l, --log-level=<option>...  [default: info,status,warn,error,success] log level
                               <options: info|status|warn|error|success>
  -n, --name=<value>           name to print
  -p, --plain                  run in plain mode (no colours)
  -w, --watch                  watch for changes (streams logs to console)

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Run pipelines that you've created with error handling, retries, timeouts, isolation, and more.

EXAMPLES
  $ xgsd run my-pipeline -d data.json -w
```

_See code: [src/commands/run.ts](https://github.com/xgsd/cli/blob/v0.1.1-alpha.0/src/commands/run.ts)_
