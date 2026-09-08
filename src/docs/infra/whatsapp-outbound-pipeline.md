---
type: convention
producer: agent/gemini-3.8-flash
status: active
created: 2026-09-07
updated: 2026-09-08
expires: 2027-09-08
deprecatedReason: ""
supersededBy: ""
---

# WhatsApp Outbound Pipeline

Pipeline de despacho saliente hacia Meta Graph API.

```mermaid
sequenceDiagram
    autonumber

    participant prod as Producer (api / scheduler)
    participant db as D1 (DB)
    participant q as Queue: whatsapp
    participant worker as whatsapp-service (Consumer)
    participant meta as Meta Graph API (v20.0)
    participant dlq as Queue: whatsapp-dlq

    prod->>db: SELECT v_active_consents
    alt Opt-out activo (isOptedOut = 1)
        prod->>db: INSERT messages (status: skipped)
    else Consentimiento válido
        prod->>db: INSERT messages (status: sent, deduplicationHash)
        prod-)q: Envelope { type: 'whatsapp-outbound', payload: WhatsAppOutboundQueuePayload, metadata }
        q->>worker: queue(batch, env, ctx)
        worker->>meta: POST /{phoneNumberId}/messages (Bearer payload.credentials.accessToken)
        
        alt Despacho exitoso (HTTP 200)
            meta-->>worker: { messages: [{ id: "wamid..." }] }
            worker->>q: msg.ack()
        else Error recuperable (HTTP 429 / 5xx)
            worker->>q: msg.retry()
        else Reintentos agotados
            q->>dlq: Forward to DLQ
        end
    end
```

## Modalidades de Mensaje Saliente

El contrato [`WhatsAppOutboundQueuePayload`](/src/packages/contracts/src/contexts/communications/whatsapp-outbound-queue-message.ts) soporta cuatro modos:

- **`template`**: Plantillas HSM para recordatorios de vencimiento y primer contacto.
- **`free_form`**: Mensaje de texto libre.
- **`reaction`**: Reacción emoji referenciando el `wamid` del comprobante entrante.
- **`contact`**: Envío de vCard con los datos de contacto del PAS.

## Resolución Unificada de Credenciales

Para evitar bifurcaciones en el worker, **las credenciales siempre las resuelve la plataforma (`api` / `scheduler`)**:
- `api` consulta `organization_integrations` (o las credenciales del pool de plataforma) e inyecta `credentials.accessToken` directamente en `payload.credentials`.
- `whatsapp-service` consume el payload y despacha de forma agnóstica sin lógica condicional de tokens.
- `to` acepta tanto número de teléfono en formato E.164 como BSUID de Meta.

## Ver también

- [Whatsapp Service](/docs/servicios/whatsapp_service.md)
- [Triage de Inbound WhatsApp](/docs/decisiones/whatsapp_inbound_triage.md)
- [WhatsApp Inbound Pipeline](/src/docs/infra/whatsapp-inbound-pipeline.md)
- [Queues](/src/docs/infra/queues.md)
