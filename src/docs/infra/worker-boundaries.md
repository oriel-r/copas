---
type: convention
producer: oriel
status: draft
created: 2026-08-25
updated:
expires:
deprecatedReason: ""
supersededBy: ""
---

# Worker Boundaries

Reglas para separar el código en Workers. Refleja la
[topología de servicios](/docs/servicios/topologia_de_servicios.md).

## Un solo escritor del dominio

- Solo `api` escribe tablas de dominio en D1.
- Los adapters no tienen binding D1 de escritura.
- Evitar leer el dominio en un adapter: pasar lo necesario en el payload de la cola.
  Si es indispensable, solo lectura.

## Adapter

- Sin estado: I/O con servicio externo (Resend, WhatsApp Cloud, IA).
- Los contratos de cola (payloads) viven en `@copas/contracts`.

## Comunicación

- **Queue** para todo lo async (envío, extracción, webhooks).
- **Service binding** solo si un worker necesita una llamada sincrónica a otro.

## Deploy

- Cada worker es un deploy separado.
- Con service binding, el worker llamado se deploya primero.
