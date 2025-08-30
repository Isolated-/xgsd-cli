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

Here's an example you can get started with:

```js
// inside a pipeline.js (naming doesn't matter)
// inside a pipeline.js (naming doesn't matter)
const hasherFn = async (input) => {
  const crypto = require('crypto')
  return {hash: crypto.createHash('sha256').update(input.data).digest('hex'), data: input.data}
}

const verifyHashFn = async (input) => {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha256').update(input.data).digest('hex')
  return {valid: hash === input.hash}
}

// minimal config
module.exports = {
  timeout: 2000,
  max: 5,
  mode: 'chained',
  steps: [hasherFn, verifyHashFn],
}
```

The above example will output something like:

```text
(hasherFn) running function [runnerFn] - {"mode":"isolated","retries":5,"timeout":2000}
(hasherFn) starting worker process for isolated run [runInWorker] - {"data":"hello world"}
(hasherFn) worker process started up [runInWorker] - {"data":"hello world"}
(hasherFn) response received from worker [runInWorker] - {"result":{"hash":"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9","data":"hello world"}}
(hasherFn) function resolved successfully, data will be returned [runnerFn] - {"data":"hello world"}
(hasherFn) executed in 34.52ms - succeeded  [timedRunnerFn]
(verifyHashFn) running function [runnerFn] - {"mode":"isolated","retries":5,"timeout":2000}
(verifyHashFn) starting worker process for isolated run [runInWorker] - {"hash":"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9","data":"hello world"}
(verifyHashFn) worker process started up [runInWorker] - {"hash":"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9","data":"hello world"}
{
  hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  data: 'hello world'
}
(verifyHashFn) response received from worker [runInWorker] - {"result":{"valid":true}}
(verifyHashFn) function resolved successfully, data will be returned [runnerFn] - {"hash":"b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9","data":"hello world"}
(verifyHashFn) executed in 37.07ms - succeeded  [timedRunnerFn]
```

## Usage

Most of the orchestration options today require dependencies, network connections, and servers. You can get started with xGSD today and run code to pull and transform data before storage (ETL), automate your home, respond to events, and many more. Everything you need to get started is done for you: error handling, retry logic, timeouts, async/fanout/chained ordering, and more.

All you need to worry about is creating an action:

```js
// file: path/to/action.js

// what's the action? This is business logic, it does a thing and returns a result
const myAction = (input) => input.data.toUpperCase()
module.exports = myAction
```

You can run this action with `$ xgsd run path/to/action.js -d @payload.json` which will invoke your action with input from your `payload.json` file, or simply `$ xgsd run path/to/action.js -d "my message"`. Each action is fault tolerant and runs in isolation. **Note:** due to the current limitations with our `Worker` implementation, you'll need to ensure all variables and imports are contained within the action:

```js
// do this
const myAction = (input) => {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(input.data).digest('hex')
}

// and not this
const crypto = require('crypto')
const myAction = (input) => {
  // ... action implementation
}
```

Doing so will lead to errors as the `Worker` is unable to correctly serialize and isolate your code. This is intended and normal when working with `Worker` instances; we'll find a more flexible approach in the short term.

We didn't design everything to just run one function, create **pipelines**:

```js
// file: path/to/pipeline.js
const myAction = require('./myAction.js')
const myTransformer = (input) => input.data.toUpperCase()
module.exports = {
  timeout: 1500,
  retries: 3,
  mode: 'chained',
  validate: (data) => true,
  delay: (attempt) => attempt * 100,
  steps: [myAction, myTransformer],
}
```

Then you can run your pipeline with `$ xgsd run path/to/pipeline.js` and optionally pass data if required. This same system will be extended to include events that can run code based on pipeline changes, or changes in the internal event loop.

There are three modes: `async`, `fanout`, and `chained`. They're similar but provide additional limitations/benefits:

- `async` - runs everything as fast as possible. If errors occur then retrying will happen **after** some or more steps have been completed. Ordering is guaranteed but is useful for when ordering doesn't matter.
- `fanout` - run in order and wait for each step to fully complete but `input` is always constant and equal to what was provided. Perfect for home automation, event handling, and more.
- `chained` - run in order and wait for each step to complete but the `output` of each step becomes the `input` of the next. Perfect for when you need each action to be in sync with each other.

Here's the full configuration options and defaults:

```js
const options = {
    input: null,
    steps: [],
    timeout: 10000,
    max: 3,
    stopOnError: false,
    mode: PipelineMode.Async,
    delay: (attempt: number): number => Math.min(1000 * 2 ** attempt, 30000),
    validate: (data: any): boolean => true,
    transform: (data: any): any
}
```

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
