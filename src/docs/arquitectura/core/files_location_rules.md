---
type: convention
producer: oriel
status: active
created: 2026-08-25T13:53:04.892Z
updated: 2026-08-25
expires: 
deprecatedReason: ""
supersededBy: ""
---

# File Location Rules

## Shared

- `shared/` only holds files used by 2+ modules.
- Single-module files stay in their module.
- Move to `shared/` when a 2nd consumer appears.
- `shared/` is per-app; cross-app code becomes a package.

## Module

- Tests and implementation docs live inside the module.
- Cross-module imports only within the same bounded context; otherwise move to `shared/`.

## Core

- App-level, non-business code only: DI, routing, bootstrapping, global middlewares.

## Docs

- Implementation docs go next to the code.
- `src/docs/` only for transversal topics affecting multiple apps.
