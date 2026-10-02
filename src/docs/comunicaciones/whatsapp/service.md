---
type: convention
producer: agent/gemini-3.8-flash
status: active
created: 2026-09-11
updated:
expires: 2027-09-11
deprecatedReason: ""
supersededBy: ""
---

# WhatsApp Service Worker

Especificación técnica de implementación para el Cloudflare Worker `whatsapp-service`, adapter stateless para la integración bidireccional con Meta Graph API (WhatsApp Cloud API).

## Responsabilidad y Topología

```mermaid
flowchart LR
    subgraph Meta [Meta Cloud API]
        M_WH[Webhook Notifications]
        M_API[Graph API v20.0 /messages]
    end

    subgraph Worker [whatsapp-service Worker]
        WH_EP["/webhooks/whatsapp (Hono)"]
        QC[Queue Consumer: queue]
    end

    subgraph Queues [Cloudflare Queues]
        Q_IN[Queue: copas-whatsapp-inbound]
        Q_OUT[Queue: copas-whatsapp]
        Q_DLQ[Queue: copas-whatsapp-dlq]
    end

    subgraph Backend [Core API]
        API_CONS[API Consumer: copas-whatsapp-inbound]
        API_PROD[API / Scheduler Producer]
    end

    M_WH -->|POST /webhooks/whatsapp| WH_EP
    WH_EP -->|sendBatch| Q_IN
    Q_IN --> API_CONS

    API_PROD -->|send| Q_OUT
    Q_OUT --> QC
    QC -->|POST /{phoneNumberId}/messages| M_API
    QC -.->|Fallo 4xx / Errores no recuperables| Q_IN
    QC -.->|Max retries agotados| Q_DLQ
```

1. **Inbound (Entrante)**: Recibe webhooks de Meta en `/webhooks/whatsapp`, valida la firma HMAC-SHA256 con tiempo constante, descompone atómicamente eventos de mensajes y estados, y los encola en `copas-whatsapp-inbound` antes de retornar HTTP 200 a Meta.
2. **Outbound (Saliente)**: Consume la cola `copas-whatsapp`, mapea los mensajes a llamadas HTTP de Meta Graph API (`POST /{phoneNumberId}/messages`) usando las credenciales provistas en el mensaje, gestiona reintentos con backoff (429/5xx) y notifica fallos no recuperables (4xx) a `copas-whatsapp-inbound`.
3. **Stateless (Sin D1 ni R2)**: No persiste estado en base de datos ni gestiona almacenamiento de objetos; la persistencia y descarga de multimedia la realiza `api`.

---

## Configuración y Variables de Entorno (`wrangler.jsonc`)

| Binding / Variable | Tipo | Descripción |
|---|---|---|
| `WHATSAPP_INBOUND_QUEUE` | Queue Producer | Productor vinculado a la cola `copas-whatsapp-inbound` |
| `copas-whatsapp` | Queue Consumer | Consumidor de cola saliente con reintentos configurados y DLQ |
| `copas-whatsapp-dlq` | Dead Letter Queue | Captura de mensajes salientes que agotaron reintentos |
| `META_APP_SECRET` | Secret | Secreto de la aplicación Meta para validar firma `X-Hub-Signature-256` |
| `META_VERIFY_TOKEN` | Secret | Token de verificación de suscripción para `GET /webhooks/whatsapp` |
| `META_GRAPH_API_VERSION` | Variable | Versión de Meta Graph API (default: `v20.0`) |
| `META_GRAPH_API_BASE_URL` | Variable | URL base de Meta Graph API (default: `https://graph.facebook.com`) |

---

## Endpoints HTTP

### 1. `GET /health`
Verificación de estado de salud del Worker.
- **Respuesta**: `HTTP 200 OK` `{ "status": "ok", "service": "whatsapp-service" }`.

### 2. `GET /webhooks/whatsapp`
Verificación de suscripción del Webhook por parte de Meta.
- **Query Params requeridos**:
  - `hub.mode`: Debe ser estrictamente `'subscribe'`.
  - `hub.verify_token`: Debe coincidir con `env.META_VERIFY_TOKEN`.
  - `hub.challenge`: Cadena de desafío provista por Meta.
- **Comportamiento**:
  - Si los valores son válidos: retorna `hub.challenge` en texto plano con código `HTTP 200`.
  - Si no coinciden: retorna `HTTP 403 Forbidden` (`'Forbidden'`).

### 3. `POST /webhooks/whatsapp`
Recepción de notificaciones y eventos en tiempo real.
- **Headers requeridos**:
  - `X-Hub-Signature-256`: Firma en formato `sha256=<hash_hex>`.
- **Validación de Seguridad**:
  - Se calcula el HMAC-SHA256 sobre el cuerpo de la petición crudo (`rawBody` como `ArrayBuffer` o texto intacto) utilizando `env.META_APP_SECRET`.
  - Se compara el hash con el encabezado mediante comparación en tiempo constante (`timingSafeEqual` o Web Crypto).
  - Si la firma es inválida o el encabezado está ausente: retorna `HTTP 401 Unauthorized` `{ "error": "Invalid signature" }`.
- **Procesamiento de Eventos**:
  - Itera `entry[].changes[].value` extrayendo `metadata.phone_number_id`, `contacts[]`, `messages[]` y `statuses[]`.
  - Cada mensaje en `messages[]` se normaliza como [`WhatsAppInboundMessageQueueMessage`](/src/packages/contracts/src/contexts/communications/whatsapp-inbound-message-queue-message.ts):
    - Extrae `wamid` (`message.id`), `from`, `bsuid` (`contact.user_id`), `username` y `senderName`.
    - Normaliza `type` (`text`, `image`, `document`, `audio`, `interactive`, `location`, `contacts`, o `'unknown'`).
    - Para `interactive`, descompone `button_reply`, `list_reply` y `nfm_reply` (parseando el `response_json` de WhatsApp Flows).
    - Asigna `idempotencyKey: "inbound:msg:" + message.id`.
  - Cada estado en `statuses[]` se normaliza como [`WhatsAppStatusUpdateQueueMessage`](/src/packages/contracts/src/contexts/communications/whatsapp-status-update-queue-message.ts):
    - Extrae `wamid` (`status.id`), `phoneNumberId`, `recipientPhone` (`status.recipient_id`), `recipientUserId` (BSUID), `status` (`sent` \| `delivered` \| `read` \| `failed`), `timestamp` y `errors`.
    - Asigna `idempotencyKey: "inbound:status:" + status.id + ":" + status.status`.
- **Garantía de Entrega**:
  - Despacha el lote consolidado mediante `await env.WHATSAPP_INBOUND_QUEUE.sendBatch(...)`.
  - Una vez confirmado el encolado, responde `HTTP 200 OK` `{ "success": true }`. Si la cola falla, la petición retorna error 5xx para que Meta reintente.

---

## Consumidor de Cola Outbound (`queue`)

Procesa lotes de mensajes que cumplen con [`WhatsAppOutboundQueueMessage`](/src/packages/contracts/src/contexts/communications/whatsapp-outbound-queue-message.ts).

### Modos Soportados de Despacho
1. **`template`**: Envío de plantillas HSM (recordatorios, avisos). Soporta parámetros de texto, moneda, fecha/hora, imagen, documento y acciones de Flow en botones.
2. **`free_form`**: Mensaje de texto libre (`{ "text": { "preview_url": false, "body": payload.text } }`). Válido únicamente dentro de la ventana de 24h.
3. **`reaction`**: Reacción emoji sobre un mensaje previo (`{ "reaction": { "message_id": payload.reaction.messageId, "emoji": payload.reaction.emoji } }`).
4. **`contact`**: Envío de vCard de contacto (`{ "contacts": [payload.contact] }`).
5. **`interactive`**: Mensajes interactivos directos (WhatsApp Flows estáticos, botones y listas dentro de la ventana de 24h).

### Matriz de Errores y Reintentos

| Código / Situación | Clasificación | Acción en Worker | Impacto en Sistema |
|---|---|---|---|
| `HTTP 200 OK` | Éxito | `msg.ack()` | Mensaje entregado a Meta |
| `HTTP 429` (Rate Limit) | Transitorio | `msg.retry()` | Reintento con backoff exponencial |
| `HTTP 5xx` / Timeout | Transitorio | `msg.retry()` | Reintento con backoff exponencial |
| `HTTP 4xx` (131047: Ventana 24h expirada) | No recuperable | Notificar fallo a inbound + `msg.ack()` | `api` registra `status = 'failed'` por ventana cerrada |
| `HTTP 400/401/403` (Token inválido, número no WhatsApp) | No recuperable | Notificar fallo a inbound + `msg.ack()` | `api` registra `status = 'failed'` con código de error de Meta |
| Reintentos agotados (`max_retries: 5`) | Excedido | Derivado a `copas-whatsapp-dlq` | Alerta para revisión técnica |

#### Notificación de Fallo 4xx a Inbound
Cuando Meta rechaza un despacho saliente con código 4xx no recuperable:
1. El worker genera un [`WhatsAppStatusUpdateQueueMessage`](/src/packages/contracts/src/contexts/communications/whatsapp-status-update-queue-message.ts):
   - `wamid: "failed:" + payload.messageId`
   - `phoneNumberId: payload.phoneNumberId`
   - `recipientPhone: payload.to`
   - `status: "failed"`
   - `timestamp: Math.floor(Date.now() / 1000)`
   - `errors: [{ code: metaError.code, title: metaError.type, message: metaError.message, errorData: metaError.error_data }]`
2. Encola el evento en `env.WHATSAPP_INBOUND_QUEUE` con `idempotencyKey: "failed-dispatch:" + payload.messageId`.
3. Confirma el mensaje saliente con `msg.ack()` para descongestionar la cola.

---

## Arquitectura Modular del Código

El código de `src/apps/whatsapp-service/src/` se organiza en módulos desacoplados:

```txt
src/apps/whatsapp-service/src/
├── types/
│   └── env.ts                # Tipos de CloudflareBindings y esquemas de Meta
├── webhook/
│   ├── hmac.ts               # Validación de firma HMAC-SHA256 con Web Crypto
│   ├── normalizer.ts         # Mapeo de payloads de Meta a contratos canónicos
│   └── routes.ts             # Rutas Hono (GET /health, GET/POST /webhooks/whatsapp)
├── meta/
│   └── client.ts             # Cliente HTTP tipado para Meta Graph API (/messages)
├── consumer/
│   └── handler.ts            # Handler de cola Cloudflare (queue) con retries y 4xx fallback
└── index.ts                  # Entrypoint: middlewares de @copas/logger y export { fetch, queue }
```

---

## Ver también

- [Concepto: WhatsApp Service](/docs/comunicaciones/whatsapp/servicio.md)
- [Triage de Inbound WhatsApp](/docs/comunicaciones/whatsapp/inbound_triage.md)
- [WhatsApp Outbound Pipeline](/src/docs/comunicaciones/whatsapp/outbound-pipeline.md)
- [WhatsApp Inbound Pipeline](/src/docs/comunicaciones/whatsapp/inbound-pipeline.md)
- [Queues](/src/docs/arquitectura/infra/queues.md)
- [Worker Boundaries](/src/docs/arquitectura/infra/worker-boundaries.md)
