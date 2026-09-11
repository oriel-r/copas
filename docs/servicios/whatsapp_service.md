---
type: concept
producer: agent/gemini-3.8-flash
status: active
created: 2026-08-25
updated: 2026-09-11
expires: 2027-09-11
deprecatedReason: ""
supersededBy: ""
---

# Whatsapp Service

Adapter sin estado para la integración con WhatsApp Cloud API (Meta Graph API).

## Responsabilidad y Flujos

- **Saliente (Outbound)**: Consume la cola `copas-whatsapp` y despacha a Meta Graph API.
- **Entrante (Inbound)**: Recibe webhooks de Meta en `/webhooks/whatsapp`, valida firma HMAC-SHA256, normaliza eventos y encola en `copas-whatsapp-inbound`.
- **Sin D1**: No persiste en base de datos; la lógica de negocio y persistencia la ejecuta `api`.

## Modelo de Cuentas WABA (Híbrido)

- **Plan Base**: Pool compartido de números de plataforma (`owner_kind = 'platform'`).
- **Planes Superiores**: Embedded Signup para conectar WABA y números propios (`owner_kind = 'organization'`).

## Ver también

- [WhatsApp Service Worker](/src/docs/infra/whatsapp-service.md)
- [Topología de Servicios](/docs/servicios/topologia_de_servicios.md)
- [Triage de Inbound WhatsApp](/docs/decisiones/whatsapp_inbound_triage.md)
- [WhatsApp Outbound Pipeline](/src/docs/infra/whatsapp-outbound-pipeline.md)
- [WhatsApp Inbound Pipeline](/src/docs/infra/whatsapp-inbound-pipeline.md)
- [Queues](/src/docs/infra/queues.md)
