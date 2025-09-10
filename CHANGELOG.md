# Changelog

All notable changes to this project will be documented in this file.  
This project follows [Semantic Versioning](https://semver.org/).

---

## [`v0.4.3`] - Unreleased

### Added

- **No isolation run mode** now supported through `$ xgsd run` only, use `--lite` to enable this. Perfect for workflows that don't benefit from process isolation.
- **Webhooks** can now be fired at the end of your workflow (experimental)

### Changed

- **Isolation** has changed, workflows no longer run in their own process and instead are coupled with the CLI process. Steps continue to remain isolated. This reduces the time to start and when used with `--lite` can complete workflows in milliseconds vs seconds.

### Fixed

- **Batched mode** would error on some versions of `v0.4.2`, this has been fixed.

---

## [`v0.4.2`] - 2025-09-09

### Added

- **Batched mode** - similar to async and chained, **batch** mode passes an input by batch instead of by step. The resulting batch output is merged and passed into the next batch.
- **Concurrency** - as a precaution, _all workflows_ go through the same concurrency handler that **async** uses, **chained** and **fanout** modes are forced to use a concurrency of 1.

### Fixed

- **Concurrency override** - concurrency was being overridden by default value in flags when using `$ xgsd run`. This has been fixed.

## [`v0.4.1`] - 2025-09-08

### Fixed

- **Docker support** was broken when installing with curl/wget. This has been fixed.

## [`v0.4.0`] - 2025-09-07

This version focuses on significant improvements to stability and process management.

### Added

- **Safety net for workflows already running** - if your workflow is _failing_ and in retry mode, multiple processes may be spawned. To protect against this a simple state check is made against the most recent running workflow. This may change in future if this becomes more of a limit than a safeguard.
- **Hard delay** - added to prevent your steps overwhelming backend services accidentally. This is a very minor delay that scales with the amount of steps in your workflow. It starts at 100ms and will stop at 10ms when your workflow includes _many_ steps. This does not impact your step timing but will impact the overall run time of your workflow.
- **Wait time (delay)** - added to the start of each step. You'll see "action is waiting for Xs" in your logs.
- **Hard limit added to response size** - your action must return a response of less than 256 KB or else it will fail. If your application needs to return more data, write the data to disk and return the path instead.

### Changed

- **Error handling inside step process** has been significantly improved, you'll see more details in your results + logs.
- **Configuration and latest result** are stored under your workflow name and config hash to make debugging easier. Configuration is no longer stored in your result file to keep file size small. If you disable collection, the results (including `config.json` and `latest.json`) will be removed.
- **Function return values** must be an object, if not the returned value is wrapped into a `data` property.
- **Workflow results and logs** are now stored outside of your project `/home/me/.xgsd/{workflow}`. Override this by setting `logs.path` to your desired path (works for both logs and results). Results are no longer sent between processes and instead are collected in a file.
- **Workflow names** are now normalised for logging purposes. Names also now default to your config file name instead of package name if no name is provided.
- **Run command** no longer enforces path to be relative to current working directory, any OS-supported path will now work.
- **Process manager** at workflow level now ensures async workflows don't spawn too many processes at once. You can configure `concurrency` in the same way you would `timeout` or `retries` just remember this only applies to the workflow itself (cannot be applied at step level).

---

## [`v0.3.5`] - 2025-09-05

### Changed

- **Removes lodash as dependency** - was only used for `merge()` this has been replicated and lodash is now removed.
- **Automated CI/CD** - improving stability of xGSD and ensuring releases to stable are _stable_.

---

## [`v0.3.4`] - 2025-09-05

### Changed

- **Dependencies** that are not being used right now been removed. Future functionality will be designed as a **plugin** when it doesn't directly relate to workflow orchestration. This reduces release build size to `< 60 MB` (tarball) and `< 40 MB` (deb).
- **Update manager** - auto update the CLI without `npm install -g @xgsd/cli`. Opt in for frequent updates with `xgsd update beta`. `stable` channel will now experience less changes (`vX.Y.0` will be pushed to stable). More installation options have been added for Windows and Linux users.

---

## [`v0.3.3`] - 2025-09-05

`v0.3.3` and `v0.3.2` were released together.

### Added

- **Environment variables** can be passed into the process running your workflow step. \*Keeping sensitive information in your configuration file isn't recommended - this will be extended with **secret management\***.

## [v0.3.2] - 2025-09-04

`v0.3.2` focused on improving existing features and ensuring stability.

### Added

- **Docker support** is now enabled for `--workflow` flag.
- **Backoff configuration** is now supported with three options: `linear`, `exponential` and `squaring`. These will be extended in future in addition to setting minimums and maximums.

### Changed

- **Workflow events** are now emitted from with the process handlers. This will be used for webhooks in later versions.
- **Configuration** now supports `version` at the top level (defaults to your package.json version otherwise). Configuration hash is also provided in logs and reports to enable easier debugging.
- **Logging** no longer outputs files to a flat folder, instead log files are grouped by day and config hash, in addition to the hour (if `logs.bucket` = `1h`). Right now only `1h` and `1d` options are supported.
- **Application logging** is now streamed into your log file enabling traceability.
- **Daily logs** are now collected for _all_ workflows, this enables easier debugging as you no longer need to piece together information across files.

### Fixed

- **Workflow step process** has been refactored for testability, **disabled steps** will no longer cause the child process to hang indefinitely, and `if` and `enabled` work in the same way (step level only).
- **Quickstart example** has been fixed, most of `README.md` has been refactored for clarity.
- **Errors** in workflow (not your application) no longer bring the entire system down.
- **Hard blocking code** (`while (true) {}`) will no longer halt your workflow. **Note**: unlike soft blocks (timer/network/promises/etc), there is currently no retry logic.
- **Memory leak & dangling processes** caused only when the process doesn't exit gracefully has now been fixed (e.g. errors in xGSD). Process will ungracefully exit if failure occurs.

---

## [v0.3.1] - 2025-09-03

`v0.3.0` introduced a number of new changes and `async` mode was temporarily removed and wasn't ever added back in. This has now been fixed, if you're missing `async` mode then redownload the CLI:

```bash
# remove it
npm uninstall -g @xgsd/cli

# re-install it
npm install -g @xgsd/cli@0.3.1
```

### Fixed

- Fixes Quickstart example (adding command) documentation in README.md.
- Fixes lack of async support caused by developer error (sorry if this affected you).
- Fixes workflow-level enable/disable caused by `enabled: config.enabled || true` (should've been `config.enabled ?? true`)

---

## [v0.3.0] - 2025-09-03

Changes are tracked from this version onward.

### Added

- Very limited support for Docker workflows
- Templating engine with helper functions (`upper`, `hash`, `json`, etc.)
- Support for chaining helpers: `{{ .input | json | hash | slice(0,8) }}`
- Conditional logic with `if:` blocks (`!null`, `!empty`, etc.)
- Object/array transforms (`merge`, `concat`, `slice`, `length`)
- Utility helpers (`uuid`, `now`, `default`, `truncate`)

---
