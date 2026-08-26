---
type: convention
producer: oriel
status: draft
created: 2026-08-25
updated:
expires:
deprecatedReason: ""
supersededBy: ""
---

# Queues

## Colas

| Cola | Productor | Consumidor |
|---|---|---|
| `email` | `api` | `email-service` |
| `whatsapp` | `api`, `scheduler` | `whatsapp-service` |
| `whatsapp-inbound` | `whatsapp-service` | `api` |
| `ai` | `api` | `extractor` |
| `ai-result` | `extractor` | `api` |

## Envelope

```ts
type Envelope<T = unknown> = {
  type: string // discrimina el caso
  payload: T
  metadata?: {
    organizationId: string
    idempotencyKey: string
  }
}
```

## Reglas

- Por la cola pasan claves de R2 (`policyAssetKey`), nunca binarios.
- Entrega at-least-once: el consumer es idempotente por `idempotencyKey`
  (o `deduplication_hash` donde aplique).
- El consumer hace ack/retry; no asume entrega única.
