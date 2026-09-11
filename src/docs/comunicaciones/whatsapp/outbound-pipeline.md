---
type: convention
producer: agent/gemini-3.8-flash
status: active
created: 2026-09-07
updated: 2026-09-11
expires: 2027-09-11
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
    participant q as Queue: copas-whatsapp
    participant worker as whatsapp-service (Consumer)
    participant meta as Meta Graph API (v20.0)
    participant q_in as Queue: copas-whatsapp-inbound
    participant dlq as Queue: copas-whatsapp-dlq

    prod->>db: SELECT v_active_consents
    alt Opt-out activo (isOptedOut = 1)
        prod->>db: INSERT messages (status: skipped)
    else Consentimiento válido
        prod->>db: Validar ventana de 24h (si mode != 'template')
        prod->>db: INSERT messages (status: sent, deduplicationHash)
        prod-)q: Envelope { type: 'whatsapp-outbound', payload: WhatsAppOutboundQueuePayload, metadata }
        q->>worker: queue(batch, env, ctx)
        worker->>meta: POST /{phoneNumberId}/messages (Bearer payload.credentials.accessToken)
        
        alt Despacho exitoso (HTTP 200)
            meta-->>worker: { messages: [{ id: "wamid..." }] }
            worker->>q: msg.ack()
        else Error recuperable (HTTP 429 / 5xx)
            worker->>q: msg.retry()
        else Error 4xx no recuperable (131047 / 400 / 401)
            worker-)q_in: Envelope { type: 'whatsapp-status-update', payload: { status: 'failed', ... } }
            worker->>q: msg.ack()
        else Reintentos agotados
            q->>dlq: Forward to DLQ
        end
    end
```

## Modalidades de Mensaje Saliente

El contrato [`WhatsAppOutboundQueuePayload`](/src/packages/contracts/src/contexts/communications/whatsapp-outbound-queue-message.ts) soporta cinco modos:

- **`template`**: Plantillas HSM para recordatorios de vencimiento y primer contacto (soporta parámetros de texto, moneda, fecha/hora, imagen, documento y acciones de Flow en botones).
- **`free_form`**: Mensaje de texto libre (restringido a la ventana de 24h).
- **`reaction`**: Reacción emoji referenciando el `wamid` del mensaje entrante.
- **`contact`**: Envío de vCard con los datos de contacto del PAS.
- **`interactive`**: Mensajes interactivos directos (WhatsApp Flows estáticos y botones de respuesta rápida dentro de la ventana de 24h).

## Regla de la Ventana de 24 Horas de Meta (Customer Service Window)

Conforme a las políticas de Meta WhatsApp Business Platform:
- Los mensajes de tipo `free_form`, `contact`, `reaction` e `interactive` **únicamente** pueden enviarse dentro de las 24 horas posteriores al último mensaje entrante del destinatario.
- `api` y `scheduler` validan la vigencia de la ventana contra `conversations.lastMessageAt` / `messages.createdAt` antes de encolar; si la ventana expiró, solo se admite `mode: 'template'`.
- Si Meta rechaza un envío con código `131047` ("Re-engagement message"), `whatsapp-service` confirma con `msg.ack()` y notifica `status: 'failed'` a `copas-whatsapp-inbound` para que `api` asiente el fallo de forma definitiva.

## Resolución Unificada de Credenciales

Para evitar bifurcaciones en el worker, **las credenciales siempre las resuelve la plataforma (`api` / `scheduler`)**:
- `api` consulta `organization_integrations` (o las credenciales del pool de plataforma) e inyecta `credentials.accessToken` directamente en `payload.credentials`.
- `whatsapp-service` consume el payload y despacha de forma agnóstica sin lógica condicional de tokens.
- `to` acepta tanto número de teléfono en formato E.164 como BSUID de Meta.

## Ver también

- [Whatsapp Service](/docs/comunicaciones/whatsapp/servicio.md)
- [WhatsApp Service Worker](/src/docs/comunicaciones/whatsapp/service.md)
- [Triage de Inbound WhatsApp](/docs/comunicaciones/whatsapp/inbound_triage.md)
- [WhatsApp Inbound Pipeline](/src/docs/comunicaciones/whatsapp/inbound-pipeline.md)
- [Queues](/src/docs/arquitectura/infra/queues.md)
