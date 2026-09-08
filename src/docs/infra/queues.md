---
type: convention
producer: oriel
status: active
created: 2026-08-25
updated: 2026-09-07
expires: 2027-09-07
deprecatedReason: ""
supersededBy: ""
---

# Queues

## Catálogo de Colas

| Queue | Producer | Consumer | Contrato / Tipo de Mensaje |
|---|---|---|---|
| `email` | `api` | `email-service` | [`EmailQueueMessage`](/src/packages/contracts/src/contexts/communications/email-queue-message.ts) (`email-dispatch`) |
| `whatsapp` | `api`, `scheduler` | `whatsapp-service` | [`WhatsAppOutboundQueueMessage`](/src/packages/contracts/src/contexts/communications/whatsapp-outbound-queue-message.ts) (`whatsapp-outbound`) |
| `whatsapp-inbound` | `whatsapp-service` | `api` | [`WhatsAppInboundQueueMessage`](/src/packages/contracts/src/contexts/communications/whatsapp-inbound-queue-message.ts) (`whatsapp-inbound-message` \| `whatsapp-status-update`) |
| `ai` | `api` | `extractor` | [`AiQueueMessage`](/src/packages/contracts/src/contexts/ai/queue.ts) (`ai-extraction`) |
| `ai-result` | `extractor` | `api` | [`AiResultQueueMessage`](/src/packages/contracts/src/contexts/ai/queue.ts) (`ai-result`) |

## Envelope

Todos los mensajes de cola implementan el envoltorio canónico [`Envelope<T>`](/src/packages/contracts/src/shared/queue.ts):

```ts
type Envelope<T = unknown> = {
  type: string
  payload: T
  metadata?: {
    organizationId: string
    idempotencyKey: string
    requestId?: string
  }
}
```

## Reglas de Confiabilidad e Idempotencia

- **Cargas Ligeras**: Las colas transportan identificadores, texto y URLs firmadas de acceso temporal (ej. `documentUrl`). Nunca transmiten binarios directamente.
- **Entrega Al Menos Una Vez (At-Least-Once Delivery)**: Los consumidores deben ser estrictamente idempotentes mediante `metadata.idempotencyKey` o `deduplicationHash`.
- **Manejo de Reintentos y DLQ**: Ante fallos temporales (red o rate limits), el consumidor debe invocar `msg.retry()` para aplicar reintentos con backoff. Al agotar reintentos, Cloudflare deriva el mensaje a la Dead Letter Queue correspondiente (ej. `email-dlq`, `whatsapp-dlq`).

## Ver también

- [Worker Boundaries](/src/docs/infra/worker-boundaries.md)
- [Email Service Worker](/src/docs/infra/email-service.md)
- [WhatsApp Outbound Pipeline](/src/docs/infra/whatsapp-outbound-pipeline.md)
- [WhatsApp Inbound Pipeline](/src/docs/infra/whatsapp-inbound-pipeline.md)
- [AI Extraction Workflow](/src/docs/infra/ai-extraction-workflow.md)
