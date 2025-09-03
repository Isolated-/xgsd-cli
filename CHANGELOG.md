# Changelog

All notable changes to this project will be documented in this file.  
This project follows [Semantic Versioning](https://semver.org/).

---

## [v0.3.1] - Unreleased

Bugfixes, stable Docker, and more.

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
