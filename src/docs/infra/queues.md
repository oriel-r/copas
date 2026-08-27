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

# Queues

## Queues

| Queue | Producer | Consumer |
|---|---|---|
| `email` | `api` | `email-service` |
| `whatsapp` | `api`, `scheduler` | `whatsapp-service` |
| `whatsapp-inbound` | `whatsapp-service` | `api` |
| `ai` | `api` | `extractor` |
| `ai-result` | `extractor` | `api` |

## Envelope

```ts
type Envelope<T = unknown> = {
  type: string // discriminates the case
  payload: T
  metadata?: {
    organizationId: string
    idempotencyKey: string
  }
}
```

## Rules

- Queues carry identifiers and temporary access URLs (e.g. `documentUrl`), never binaries.
- At-least-once delivery: consumers are idempotent via `idempotencyKey`
  (or `deduplication_hash` where applicable).
- Consumers ack/retry; they never assume single delivery.
