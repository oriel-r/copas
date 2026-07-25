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

# Document Template

Template at `generator/doc/template.hbs`. Used by the generator to scaffold new
documents with consistent frontmatter.

## Frontmatter

| Field | Description | Values |
|---|---|---|
| `type` | Document type | See [Document Types](types.md) |
| `producer` | Author | Person name (`Jane Doe`) or `agent/<model>` (e.g. `agent/deepseek-v4-flash-free`) |
| `status` | Lifecycle stage | See [Document Lifecycle](lifecycle.md) |
| `created` | Creation date | ISO (`YYYY-MM-DD`), set on creation |
| `updated` | Last edit date | ISO, filled manually |
| `expires` | Review date | Keeps docs fresh |
| `deprecatedReason` | Why deprecated | Required if `status: deprecated` or `superseded` |
| `supersededBy` | Replacement path/URL | Required if `status: superseded` |

## Conventions

- `created` is set on creation; `updated` is updated manually on edits.
- The heading (`# {{heading}}`) must be descriptive and unique.
- For lifecycle rules, see [Document Lifecycle](lifecycle.md).