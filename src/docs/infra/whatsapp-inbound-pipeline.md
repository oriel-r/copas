---
type: convention
producer: agent/gemini-3.8-flash
status: active
created: 2026-09-07
updated: 2026-09-08
expires: 2027-09-08
deprecatedReason: ""
supersededBy: ""
---

# WhatsApp Inbound Pipeline

Ingesta de webhooks de Meta por `whatsapp-service` y orquestación de dominio en `api`.

```mermaid
sequenceDiagram
    autonumber

    participant meta as Meta Cloud API
    participant worker as whatsapp-service (Webhook)
    participant q as Queue: whatsapp-inbound
    participant api as API (Consumer)
    participant db as D1 (DB)
    participant q_out as Queue: whatsapp

    meta->>worker: POST /webhook (Header: X-Hub-Signature-256)
    Note over worker: Valida HMAC-SHA256 (META_APP_SECRET)
    worker-->>meta: HTTP 200 OK

    alt Evento de Estado (Sent / Delivered / Read / Failed)
        worker-)q: Envelope { type: 'whatsapp-status-update', payload: WhatsAppStatusUpdatePayload }
        q->>api: Consume status update (wamid, status, recipientUserId)
        api->>db: INSERT message_statuses
    else Mensaje Entrante (Texto / Medios / Botón / Flow)
        worker-)q: Envelope { type: 'whatsapp-inbound-message', payload: WhatsAppInboundMessagePayload }
        q->>api: Consume inbound message (from, bsuid, username)
        
        Note over api,db: Resolución por Teléfono o BSUID
        api->>db: SELECT insureds WHERE phone = payload.from OR bsuid = payload.bsuid
        
        alt Remitente es Asegurado Registrado
            api->>db: INSERT messages (direction: inbound, senderKind: insured)
            alt Agradecimiento ("gracias", "dale")
                Note over api: Ignorar (no responder)
            else Comprobante (Imagen / Documento)
                api-)q_out: Reacción { mode: 'reaction', emoji: '👍' }
            else Consulta General
                api-)q_out: Mensaje { mode: 'contact', contact: vCard_PAS }
                Note over api,db: Activar modo silencio
            else Botón Opt-out
                api->>db: UPDATE communication_consents (isOptedOut: true)
                api-)q_out: Confirmación de Baja
            end
        else Remitente Desconocido
            alt Primer contacto
                api-)q_out: Disparar WhatsApp Flow (Triage / Pago / Contacto)
            else Respuesta de Flow (nfm_reply)
                alt Informa Pago (CUIT / Patente)
                    api->>db: UPDATE policy_installments (status: paid)
                else Consulta / Spam
                    api->>db: INSERT conversation (status: closed)
                    api-)q_out: Despedida y Fin de Chat
                end
            else Mensajes posteriores
                Note over api: Descartar / Ignorar para evitar costos
            end
        end
    end
```

## Compatibilidad con Meta BSUID (Usernames)

Conforme a la actualización de Meta WhatsApp Business Platform:
- **BSUID (`user_id`)**: Meta introduce Business-Scoped User IDs (`US.123...`) para usuarios que adoptan nombres de usuario (`username`), ocultando el número telefónico a menos que haya interacción previa en los últimos 30 días.
- **Normalización**: `whatsapp-service` extrae tanto el teléfono (`from` / `wa_id`) como el `bsuid` (`contacts[].user_id`) y `username` opcional en [`WhatsAppInboundMessagePayload`](/src/packages/contracts/src/contexts/communications/whatsapp-inbound-message-queue-message.ts).
- **Resolución en `api`**: Si `from` es un teléfono, busca en `insureds.phone`. Si solo recibe BSUID, evalúa conversaciones previas con dicho identificador o solicita los datos mediante el WhatsApp Flow / botón `REQUEST_CONTACT_INFO`.

## Webhook Endpoints (`whatsapp-service`)

- **`GET /webhook`**: Validación de challenge (`hub.mode === 'subscribe'`, `hub.verify_token`).
- **`POST /webhook`**: Validación de firma `X-Hub-Signature-256` con `timingSafeEqual`, respuesta HTTP 200 inmediata y despacho normalizado a `whatsapp-inbound`.

## Ver también

- [Whatsapp Service](/docs/servicios/whatsapp_service.md)
- [Triage de Inbound WhatsApp](/docs/decisiones/whatsapp_inbound_triage.md)
- [WhatsApp Outbound Pipeline](/src/docs/infra/whatsapp-outbound-pipeline.md)
- [Queues](/src/docs/infra/queues.md)
