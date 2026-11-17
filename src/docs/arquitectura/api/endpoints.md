---
type: convention
producer: oriel
status: active
created: 2026-08-24T22:56:10.324Z
updated: 2026-11-17
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Endpoints

RESTful naming:

- Resource-based paths: plural nouns (`/policies`, `/insureds`, `/reminder-rules`).
- Hierarchy via nesting (`/policies/:id/installments`).
- HTTP methods express the action.
- No verbs in paths (`/connect`, `/sendReminder` ❌).

## Endpoints de Recordatorios

- `GET /reminder-rules`: Lista las reglas de recordatorio activas de la organización autenticada y sus presets.
- `POST /reminder-rules`: Crea o activa una regla de recordatorio para un evento (`installment_due` o `policy_expiration`) con su `offsetDays` y `templateId`.
- `GET /reminder-rules/:id`: Obtiene el detalle de una regla de recordatorio.
- `PATCH /reminder-rules/:id`: Actualiza el estado (`isEnabled`), `offsetDays` o `templateId` de la regla.
- `DELETE /reminder-rules/:id`: Realiza soft-delete de una regla de recordatorio.
- `GET /reminders/due`: Previsualiza las cuotas y pólizas que coinciden con las reglas vigentes para una fecha dada (`?date=YYYY-MM-DD&eventSource=...`), por defecto hoy.

> [!NOTE]
> El despacho automatizado diario del cron **no expone endpoints HTTP**; se ejecuta exclusivamente a nivel de infraestructura mediante Service Binding nativo Worker-to-Worker RPC (`WorkerEntrypoint`) invocado por el worker `scheduler`.

## Endpoints de Canales y Endpoints

- `GET /channel-endpoints/whatsapp`: Obtiene el endpoint de WhatsApp propio de la organización autenticada (`ownerKind = 'organization'`), o `{ endpoint: null }` si todavía no registró ninguno. Incluye `connectionStatus` (`connected` | `waiting_qr` | `disconnected` | `error` | `null`).
- `PUT /channel-endpoints/whatsapp`: Registra o actualiza el número de teléfono de WhatsApp propio de la organización autenticada en `channel_endpoints` (creando si no existen el canal en `organization_channels` y el vínculo en `organization_channel_endpoints`) con estado inicial `inactive` y `connectionStatus: null` hasta completar la vinculación.
- `POST /webhooks/whatsapp-channel-status`: Webhook agnóstico firmado con `X-Hub-Signature-256` (`WHATSAPP_STATUS_WEBHOOK_SECRET` o `META_APP_SECRET`) para sincronizar el estado de conexión de un número (`connected` | `waiting_qr` | `disconnected` | `error`) y activar/suspender automáticamente su enrutamiento en D1.

