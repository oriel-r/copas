---
type: meta
producer: agent/deepseek-v4-flash-free
status: active
created: 2026-07-24
updated:
expires: 2027-07-24
deprecatedReason: ""
supersededBy: ""
---

# Document Lifecycle

Documents progress through a linear lifecycle. Once a document leaves `active`
status, it enters a terminal state and should no longer be consulted.

## Statuses

| Status | Meaning | Source of truth? |
|--------|---------|-----------------|
| `draft` | Work in progress, not ready for consumption | ❌ Check applicability/validity first |
| `active` | Current and valid | ✅ **Yes, source of truth** |
| `deprecated` | Replaced or no longer valid | ❌ Ignore |
| `superseded` | Replaced by another document (requires `supersededBy`) | ❌ Ignore |
| `archived` | No longer relevant | ❌ Ignore |

## Transitions

```
draft ──► active ──► deprecated
                    ├─► superseded (requires `supersededBy`)
                    └─► archived
```

- Terminal states (`deprecated`, `superseded`, `archived`) have no outgoing
  transitions.
- When a document leaves `active`, it must go to `deprecated`, `superseded`
  (with `supersededBy`), or `archived`.

## Required Fields

| Status | Required fields |
|--------|----------------|
| `deprecated` | `deprecatedReason` |
| `superseded` | `deprecatedReason`, `supersededBy` |