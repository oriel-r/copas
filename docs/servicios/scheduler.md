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

Servicio de consulta y encolado de recordatorios.

## Preguntas pendientes

- ¿Cada cuánto corre y en qué ventana horaria (`America/Argentina/Buenos_Aires`)?
- ¿Cómo se evalúan `reminder_rules` (`event_source`, `offset_days`)?
- ¿Qué payload se encola?
- ¿Cómo se garantiza idempotencia (`deduplication_hash`)?
- ¿Hay reintentos ante fallos?
