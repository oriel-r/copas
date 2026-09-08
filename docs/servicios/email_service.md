---
type: concept
producer: agent/gemini-3.8-flash
status: active
created: 2026-08-25
updated: 2026-09-08
expires: 2027-09-08
deprecatedReason: ""
supersededBy: ""
---

# Email Service

Adapter sin estado para el envío de notificaciones transaccionales del sistema vía Resend.

## Responsabilidad y Flujo

- **Adapter sin D1**: Solo consume la cola `email`; no escribe en base de datos.
- **Renderizado en API**: Recibe el HTML y texto ya resueltos desde `api`.
- **Proveedor**: Resend centralizado de plataforma (`RESEND_API_KEY`, remitente institucional).

## Eventos Disparadores (`system_notifications`)

- **Auth**: Verificación de email, restablecimiento de contraseña, invitaciones.
- **Billing**: Comprobantes de pago, avisos de cobro fallido o cancelación de suscripción.
- **Alertas de Sistema**: Avisos administrativos internos a usuarios de la organización.

## Entrega

- Modelo fire-and-retry con `ack()` ante HTTP 200 de Resend.
- Reintentos exponenciales automáticos de Cloudflare Queues y desvío a DLQ (`email-dlq`).

## Ver también

- [Topología de Servicios](/docs/servicios/topologia_de_servicios.md)
- [Email Service Worker](/src/docs/infra/email-service.md)
- [Queues](/src/docs/infra/queues.md)
