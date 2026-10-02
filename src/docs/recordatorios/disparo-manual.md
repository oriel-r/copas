---
type: convention
producer: agent/gemini-3.8-flash
status: active
created: 2026-09-23
updated:
expires: 2027-09-23
deprecatedReason: ""
supersededBy: ""
---

# Disparo Manual de WhatsApps (Batch e Individual)

Especificación técnica de la orquestación a demanda para el envío manual de recordatorios vía WhatsApp, respetando los límites de contexto y la arquitectura de mensajería saliente de Copas.

## Casos de Uso

1. **Disparo en Lote (Batch)**:
   - Permite al usuario (PAS o administrador de agencia) disparar desde el Dashboard el envío de todos los recordatorios programados del día para su organización.
   - Endpoint: `POST /reminders/executions`

2. **Disparo Individual (Por Cuota)**:
   - Permite disparar la notificación puntual sobre una cuota específica desde la tabla de vencimientos o detalle de cartera.
   - Endpoint: `POST /reminders/installments/:id`

## Reglas de Negocio e Idempotencia

### Deduplicación Diaria
- Ambos disparos calculan la clave determinística SHA-256:
  `SHA-256(organizationId + ':' + reminderRuleId + ':' + entityId + ':' + scheduledDate)`
- Si la cuota ya fue notificada en el día:
  - En **Lote**: Se contabiliza en `totalAlreadySent` y se omite silenciosamente sin duplicar el mensaje.
  - En **Individual**:
    - Si `forceResend: false` (default): La API responde con `HTTP 409 Conflict`.
    - Si `forceResend: true`: Se fuerza un nuevo envío omitiendo el bloqueo de duplicado.

### Garantías de Entrega y Formato
- Todo recordatorio se despacha bajo la modalidad `template` (plantilla HSM aprobada por Meta), garantizando entrega incluso fuera de la ventana de servicio al cliente de 24 horas (ver [WhatsApp Outbound Pipeline](/src/docs/comunicaciones/whatsapp/outbound-pipeline.md)).
- Si el asegurado no tiene teléfono registrado o tiene opt-out activo (`communication_consents`), el recordatorio se asienta con `status: 'skipped'` y la causa respectiva (`missing_phone` u `opt_out`).

## Endpoints HTTP

### `POST /reminders/executions`
- **Request Body**:
  ```json
  {
    "scheduledDate": "YYYY-MM-DD" // Opcional, por defecto fecha civil actual de Argentina
  }
  ```
- **Response 201 Created**:
  ```json
  {
    "scheduledDate": "2026-09-23",
    "totalEvaluated": 12,
    "totalEnqueued": 10,
    "totalSkipped": 2,
    "totalAlreadySent": 0,
    "errors": []
  }
  ```
- **Errores**:
  - `400 Bad Request`: Formato de fecha inválido.
  - `401 Unauthorized`: Organización no autenticada.

### `POST /reminders/installments/:id`
- **Request Param**: `:id` (UUID de la cuota).
- **Request Body**:
  ```json
  {
    "forceResend": false, // Opcional, default false
    "scheduledDate": "YYYY-MM-DD" // Opcional
  }
  ```
- **Response 201 Created**:
  ```json
  {
    "installmentId": "uuid-v7",
    "ruleId": "uuid-v7",
    "deduplicationHash": "a1b2c3...",
    "status": "enqueued",
    "messageId": "msg-uuid",
    "skipReason": null
  }
  ```
- **Errores**:
  - `404 Not Found`: Cuota no encontrada o perteneciente a otra organización.
  - `409 Conflict`: Recordatorio ya enviado en la fecha (requiere `forceResend: true`).
  - `422 Unprocessable Entity`: No existe regla de recordatorio activa para la cuota.

## Ver también
- [Pipeline Outbound WhatsApp](/src/docs/comunicaciones/whatsapp/outbound-pipeline.md)
- [Servicio Scheduler](/docs/recordatorios/scheduler.md)
- [Catálogo de Endpoints](/src/docs/arquitectura/api/endpoints.md)
