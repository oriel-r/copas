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

# Domains

Three top-level directories grouping content by nature. Markdown documents can
cross-reference across domains using absolute paths from the project root.

| Domain | Purpose | Examples |
|---|---|---|
| `docs/` | Business documentation, implementation-independent | decisions, roadmaps, concepts, conventions |
| `src/` | Source code + technical docs tied to implementation | apps, packages, API usage guides |
| `scripts/` | Audiovisual content scripts | videos, reels, TikTok |

## docs/

Business documentation. Not directly tied to code. A decision may reference
implementations under `/src/` and vice versa.

`/docs/index.md` is the entry point. Subdirectories by topic.

## src/

Source code + its documentation (how to use, integrate, etc). Changes with
code.

Structure: `/src/apps/` (services, micro-frontends), `/src/packages/`
(shared libraries).

## scripts/

Content scripts for marketing/communication. No code, no technical jargon.
Target: non-technical audience.

## Cross-referencing

Use absolute paths from root. Only when the link adds real value.

```
See [decision](/docs/decisions/use-tailwind.md) behind this API.
```