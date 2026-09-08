---
type: convention
producer: agent/gemini-3.8-flash
status: active
created: 2026-09-07
updated:
expires: 2027-09-07
deprecatedReason: ""
supersededBy: ""
---

# Email Service Worker

Especificación de implementación técnica para el Cloudflare Worker `email-service`, adapter sin estado para el envío de correos electrónicos transaccionales vía Resend.

## Arquitectura de Despacho

```mermaid
sequenceDiagram
    autonumber

    participant api as API (Producer)
    participant db as D1 (DB)
    participant q as Queue: email
    participant worker as email-service (Consumer)
    participant resend as Resend API
    participant dlq as Queue: email-dlq

    api->>db: INSERT system_notifications (status: sent)
    api-)q: Envelope { type: 'email-dispatch', payload: EmailQueuePayload, metadata }
    q->>worker: queue(batch, env, ctx)
    worker->>resend: POST https://api.resend.com/emails (RESEND_API_KEY)
    
    alt Entrega exitosa (HTTP 200)
        resend-->>worker: { id: "re_12345" }
        worker->>q: msg.ack()
    else Error transitorio (HTTP 429 / 5xx / Red)
        resend-->>worker: Error
        worker->>q: msg.retry() (Backoff exponencial)
    else Reintentos agotados
        q->>dlq: Forward to Dead Letter Queue
    end
```

## Configuración y Variables de Entorno

El worker `email-service` requiere en su entorno de ejecución (`wrangler.jsonc`):

| Variable / Binding | Tipo | Descripción |
|---|---|---|
| `EMAIL_QUEUE` | Queue Consumer | Consumidor vinculado a la cola `email` de Cloudflare |
| `RESEND_API_KEY` | Secret | Token API de Resend para autenticación de peticiones HTTP |
| `DEFAULT_FROM_EMAIL` | Variable | Dirección predeterminada del remitente (ej. `notificaciones@copas.app`) |

## Contrato de Mensaje (`@copas/contracts`)

El worker procesa mensajes que cumplen con el contrato atómico [`EmailQueueMessage`](/src/packages/contracts/src/contexts/communications/email-queue-message.ts):

```ts
type EmailQueuePayload = {
  notificationId: string
  recipientEmail: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tags?: Record<string, string>
}
```

## Reglas de Confiabilidad y Reintentos

1. **Pre-renderizado en API**: `email-service` no realiza interpolación de plantillas ni consultas a base de datos. Recibe `html` y `text` ya generados.
2. **Idempotencia**: Si el mensaje contiene `metadata.idempotencyKey`, se envía el header `Idempotency-Key` en la llamada a Resend para evitar envíos duplicados ante reintentos de la cola.
3. **Manejo de Errores**:
   - Códigos HTTP 4xx no recuperables (ej. 422 destinatario inválido): se descarta con `msg.ack()` para no bloquear la cola.
   - Errores de disponibilidad (HTTP 429, 500, 502, timeouts): se dispara `msg.retry()` permitiendo reintento con backoff exponencial.
   - Dead Letter Queue (`email-dlq`): captura mensajes que exceden el límite configurado de reintentos (5 intentos).

## Ver también

- [Concepto: Email Service](/docs/servicios/email_service.md)
- [Queues](/src/docs/infra/queues.md)
- [Worker Boundaries](/src/docs/infra/worker-boundaries.md)
