---
type: convention
producer: oriel
status: active
created: 2026-08-25
updated: 2026-09-11
expires: 2027-09-11
deprecatedReason: ""
supersededBy: ""
---

# Queues

## Catálogo de Colas

| Queue Lógica | Nombre Físico Cloudflare | Producer | Consumer | Contrato / Tipo de Mensaje |
|---|---|---|---|---|
| `email` | `copas-email` | `api` | `email-service` | [`EmailQueueMessage`](/src/packages/contracts/src/contexts/communications/email-queue-message.ts) (`email-dispatch`) |
| `whatsapp` | `copas-whatsapp` | `api`, `scheduler` | `whatsapp-service` | [`WhatsAppOutboundQueueMessage`](/src/packages/contracts/src/contexts/communications/whatsapp-outbound-queue-message.ts) (`whatsapp-outbound`) |
| `whatsapp-inbound` | `copas-whatsapp-inbound` | `whatsapp-service` | `api` | [`WhatsAppInboundQueueMessage`](/src/packages/contracts/src/contexts/communications/whatsapp-inbound-queue-message.ts) (`whatsapp-inbound-message` \| `whatsapp-status-update`) |
| `ai` | `copas-ai-extraction` | `api` | `extractor` | [`AiQueueMessage`](/src/packages/contracts/src/contexts/ai/queue.ts) (`ai-extraction`) |
| `ai-result` | `copas-ai-result` | `extractor` | `api` | [`AiResultQueueMessage`](/src/packages/contracts/src/contexts/ai/queue.ts) (`ai-result`) |

*Nota: En ambientes de staging, los nombres físicos adoptan el sufijo `-staging` (ej. `copas-whatsapp-staging`, `copas-whatsapp-inbound-staging`).*

## Dead Letter Queues (DLQ)

- `copas-whatsapp-dlq`: Captura mensajes de `copas-whatsapp` que superan el límite de reintentos (`max_retries: 5`).
- `copas-email-dlq`: Captura mensajes de `copas-email` tras agotar reintentos.
- `copas-ai-extraction-dlq`: Captura tareas de extracción fallidas.

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
- **Manejo de Reintentos y DLQ**: Ante fallos temporales (red o rate limits), el consumidor debe invocar `msg.retry()` para aplicar reintentos con backoff. Al agotar reintentos, Cloudflare deriva el mensaje a la Dead Letter Queue correspondiente.

## Ver también

- [Worker Boundaries](/src/docs/infra/worker-boundaries.md)
- [WhatsApp Service Worker](/src/docs/infra/whatsapp-service.md)
- [WhatsApp Outbound Pipeline](/src/docs/infra/whatsapp-outbound-pipeline.md)
- [WhatsApp Inbound Pipeline](/src/docs/infra/whatsapp-inbound-pipeline.md)
- [Email Service Worker](/src/docs/infra/email-service.md)
- [AI Extraction Workflow](/src/docs/infra/ai-extraction-workflow.md)
