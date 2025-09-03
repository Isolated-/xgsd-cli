# Changelog

All notable changes to this project will be documented in this file.  
This project follows [Semantic Versioning](https://semver.org/).

---

## [v0.3.1] - Unreleased

`v0.3.0` introduced a number of new changes and `async` mode was temporarily removed and wasn't ever added back in. This has now been fixed, if you're missing `async` mode then redownload the CLI:

```bash
# remove it
npm uninstall -g @xgsd/cli

# re-install it
npm install -g @xgsd/cli@0.3.1
```

### Fixed

- Fixes lack of async support caused by developer error (sorry if this affected you).

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
