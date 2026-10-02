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

Business documentation. Not directly tied to code. Grouped semantically by bounded contexts / business domains:
- `producto/`: Vision, roadmap, document change logs.
- `agencias/`: Agency onboarding, organizations, admin panel.
- `comunicaciones/`: WhatsApp, Email, triage, outbound dispatch.
- `polizas/`: Policy portfolio, AI assisted extraction.
- `recordatorios/`: Expirations and renewals, scheduling logic.
- `facturacion/`: Billing and subscription plans.
- `arquitectura/`: Domain model (DER), service topology, high-level architecture decisions.

Subdirectories MUST be semantic contexts, NEVER grouped by document type (e.g., no `docs/decisiones/` or `docs/servicios/`). Root only contains `index.md`.

## src/

Source code + technical documentation tied to implementation.

- Code structure: `/src/apps/` (services, micro-frontends, workers), `/src/packages/` (shared libraries, contracts).
- Technical docs: `/src/docs/` organized semantically following the same bounded contexts (`agencias/`, `comunicaciones/`, `polizas/`, `arquitectura/`). Root only contains `index.md`.

## scripts/

Content scripts for marketing/communication. No code, no technical jargon.
Target: non-technical audience.

## Cross-referencing

Use absolute paths from root. Only when the link adds real value.

```markdown
See [onboarding decision](/docs/agencias/onboarding.md) behind this flow.
```