---
type: concept
producer: oriel
status: draft
created: 2026-08-25T21:19:54.815Z
updated:
expires: 
deprecatedReason: ""
supersededBy: ""
---

# Scheduler

Worker cron liviano que orquesta el despacho diario de recordatorios de vencimientos y renovaciones.

## Responsabilidad y Comportamiento

- **Orquestador sin estado ni acceso directo a D1**: Siguiendo la regla de "un solo escritor del dominio: `api`", `scheduler` no escribe en la base de datos ni produce directamente a colas de mensajería externa.
- **Worker-to-Worker RPC**: Invoca a `api` a través de un Service Binding nativo de Cloudflare con `WorkerEntrypoint` (`RemindersRpcEntrypoint.dispatchDueReminders`), recibiendo un resumen tipado de la ejecución.

## Ventana Horaria y Frecuencia

- **Frecuencia por defecto**: Lunes a viernes a las 08:00 ART (`America/Argentina/Buenos_Aires`, UTC-3 fijo, sin horario de verano).
- **Trigger Cron en Cloudflare**: `0 11 * * 1-5` (11:00 UTC = 08:00 ART).
- **Cómputo de fecha civil**: Se deriva `scheduledDate` en formato `YYYY-MM-DD` correspondiente a la fecha actual en Argentina.

## Evaluación de Reglas de Recordatorio (`reminder_rules`)

Las reglas se evalúan según el tipo de evento (`event_source`) y el desplazamiento civil en días (`offset_days`):

- `targetDate = scheduledDate - offset_days`
- **`installment_due` (Vencimiento de cuota)**:
  - Aviso previo: `offset_days = -3` (cuotas que vencen en 3 días respecto a hoy).
  - Día de vencimiento: `offset_days = 0` (cuotas que vencen hoy).
- **`policy_expiration` (Renovación de póliza)**:
  - Aviso previo renovación: `offset_days = -3` (pólizas cuya vigencia finaliza en 3 días).
  - Día de renovación: `offset_days = 0` (pólizas que finalizan hoy).

## Idempotencia y Deduplicación (`deduplication_hash`)

- La idempotencia se garantiza mediante un hash SHA-256 determinístico generado por `api`:
  `SHA-256(organizationId + ':' + reminderRuleId + ':' + entityId + ':' + scheduledDate)`
- Respaldado por la restricción `UNIQUE(organizationId, deduplicationHash)` en la tabla `messages`. Re-ejecuciones en el mismo día son omitidas silenciosamente sin duplicar mensajes en WhatsApp.

## Auditoría y Casos Omitidos (`skipped`)

- Asegurados con opt-out activo en `communication_consents`, sin número de teléfono o sin endpoint de WhatsApp activo en la organización se registran en `messages` y `message_statuses` con `status = 'skipped'`, detallando la causa en `metadata` para visualización del PAS en su panel.

