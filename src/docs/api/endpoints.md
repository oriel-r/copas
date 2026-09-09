---
type: convention
producer: oriel
status: active
created: 2026-08-24T22:56:10.324Z
updated: 2026-08-25
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

