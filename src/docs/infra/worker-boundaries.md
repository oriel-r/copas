---
type: convention
producer: oriel
status: draft
created: 2026-08-25
updated: 2026-08-26
expires:
deprecatedReason: ""
supersededBy: ""
---

# Worker Boundaries

Rules for splitting code across Workers. Mirrors the
[service topology](/docs/servicios/topologia_de_servicios.md).

## Single domain writer

- Only `api` writes domain tables in D1.
- Adapters have no write D1 binding.
- Avoid reading the domain in an adapter: pass what's needed in the queue payload.
  If unavoidable, read-only.

## Adapter

- Stateless: I/O with an external service (Resend, WhatsApp Cloud, AI).
- Queue contracts (payloads) live in `@copas/contracts`.

## Communication

- **Queue** for all async work (sending, extraction, webhooks).
- **Service binding** only when a worker needs a synchronous call to another.

## Deploy

- Each worker is a separate deploy.
- With service binding, the called worker deploys first.
