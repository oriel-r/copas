---
type: decision
producer: oriel
status: active
created: 2026-08-25
updated: 2026-09-07
expires: 2027-09-07
deprecatedReason: ""
supersededBy: ""
---

# Topologia De Servicios

Cómo se separa el sistema en Workers y qué comunica cada uno.

## Regla de oro

Un solo escritor del dominio: `api`. Los demás workers son adapters sin estado:
hacen I/O externa y no escriben el dominio.

## Workers

| Worker | Rol | Escribe dominio | Medio |
|---|---|---|---|
| `api` | Core: auth + insurance + subir PDF + pagos + despacho | sí | — |
| `client` | Frontend | no | HTTP |
| `email-service` | Envía email (Resend) | no | cola `email` |
| `whatsapp-service` | Envía + recibe webhooks WhatsApp | no | colas `whatsapp`, `whatsapp-inbound` |
| `extractor` | Extrae datos del PDF (servicio externo) | no | colas `ai`, `ai-result` |
| `scheduler` | Orquesta vencimientos y renovaciones diarios | no | Service Binding RPC (`api`) |

## Decisiones

- **`extractor` extrae, `api` registra.** El extractor devuelve JSON; `api` persiste
  `ai_extraction_results` (`on_review`) y, al recibir el resultado, crea la póliza
  y sus entidades (transaccional). La revisión humana es posterior (aprobación).
- **WhatsApp enruta por `conversation_id`.** El webhook llega a `whatsapp-service`,
  que re-encola con `conversation_id`; `api` resuelve a qué asegurado/póliza pertenece.
- **Email renderiza en `api`.** `email-service` solo envía; recibe el mensaje listo.
- **Pagos quedan en `api`.** Es HTTP como email; se extrae solo si aparece un motivo
  (varios proveedores, aislar endpoint).
- **`scheduler` es worker separado (cron), sin acceso a DB.** Invoca a `api` vía
  Service Binding nativo (`RemindersRpcEntrypoint`), preservando a `api` como único escritor del dominio y productor a la cola `whatsapp`.
- **Colas para I/O externa; RPC nativo para cron interno.** Los flujos desacoplados de entrada/salida usan colas (`whatsapp`, `whatsapp-inbound`, `email`, `ai`); la orquestación programada cron interna usa Worker-to-Worker RPC tipado.

## Ver también

- [Scheduler](/docs/servicios/scheduler.md)
- [Whatsapp Service](/docs/servicios/whatsapp_service.md)
- [Email Service](/docs/servicios/email_service.md)
- [Triage de Inbound WhatsApp](/docs/decisiones/whatsapp_inbound_triage.md)
- [Inteligencia Artificial](/docs/servicios/inteligencia_artificial.md)
- [Arquitectura de la solución](/docs/vencimientos_y_renovaciones/arquitectura_de_la_solucion.md)
