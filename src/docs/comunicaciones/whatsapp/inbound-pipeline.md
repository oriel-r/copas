---
type: convention
producer: agent/gemini-3.8-flash
status: active
created: 2026-09-07
updated: 2026-09-11
expires: 2027-09-11
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
    participant q as Queue: copas-whatsapp-inbound
    participant api as API (Consumer)
    participant r2 as Storage (R2)
    participant db as D1 (DB)
    participant q_out as Queue: copas-whatsapp

    meta->>worker: POST /webhooks/whatsapp (Header: X-Hub-Signature-256)
    Note over worker: Valida HMAC-SHA256 con tiempo constante
    worker-)q: sendBatch([WhatsAppInboundQueueMessage])
    worker-->>meta: HTTP 200 OK

    alt Evento de Estado (Sent / Delivered / Read / Failed)
        q->>api: Consume status update (wamid, status, recipientUserId)
        api->>db: INSERT message_statuses
    else Mensaje Entrante (Texto / Medios / Botón / Flow)
        q->>api: Consume inbound message (from, bsuid, username)
        
        Note over api,db: Resolución por Teléfono o BSUID
        api->>db: SELECT insureds WHERE phone = payload.from OR bsuid = payload.bsuid
        
        alt Remitente es Asegurado Registrado
            api->>db: INSERT messages (direction: inbound, senderKind: insured)
            alt Agradecimiento ("gracias", "dale")
                Note over api: Ignorar (no responder)
            else Comprobante (Imagen / Documento)
                Note over api,r2: Descarga y persistencia en R2
                api->>meta: GET /{mediaId} -> Obtains temporary download URL
                meta-->>api: 200 { url }
                api->>r2: PUT ${COPAS_BUCKET}/${orgId}/comprobantes/{wamid}_{filename}
                api-)q_out: Reacción { mode: 'reaction', emoji: '👍' }
            else Consulta General
                api-)q_out: Mensaje { mode: 'contact', contact: vCard_PAS }
                Note over api,db: Activar modo silencio
            else Botón Opt-out
                api->>db: UPDATE communication_consents (isOptedOut: true)
                api-)q_out: Confirmación de Baja
            end
        else Remitente Desconocido (Pool de Plataforma)
            alt Primer contacto
                api-)q_out: Disparar WhatsApp Flow (Triage / Pago / Contacto)
            else Respuesta de Flow (nfm_reply)
                alt Informa Pago (CUIT / Patente) y Concilia Póliza
                    api->>db: INSERT conversations (organizationId: detectedOrgId)
                    api->>db: UPDATE policy_installments (status: paid)
                else Consulta General / No Concilia con Agencia
                    api->>db: INSERT conversations (organizationId: PLATFORM_SYSTEM_ORG_ID)
                    Note over api,db: Se preserva como lead para derivación comercial
                    api-)q_out: Despedida y Fin de Chat
                end
            else Mensajes posteriores tras cierre
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

## Pipeline de Descarga y Almacenamiento de Multimedia

1. **Stateless en Worker**: `whatsapp-service` nunca descarga binarios; transporta el `media.id`, `mimeType` y `caption` a través de `copas-whatsapp-inbound`.
2. **Descarga en `api`**: El consumidor en `api` consulta `GET https://graph.facebook.com/v20.0/{media_id}` para obtener la URL efímera firmada y descarga los bytes.
3. **Estructura en R2 (`COPAS_BUCKET`)**:
   - Pólizas: `${COPAS_BUCKET}/${organizationId}/polizas/...`
   - Comprobantes de pago: `${COPAS_BUCKET}/${organizationId}/comprobantes/{wamid}_{filename}`

## Webhook Endpoints (`whatsapp-service`)

- **`GET /webhooks/whatsapp`**: Validación de challenge (`hub.mode === 'subscribe'`, `hub.verify_token` coincide con `env.META_VERIFY_TOKEN`).
- **`POST /webhooks/whatsapp`**: Validación de firma `X-Hub-Signature-256` con HMAC-SHA256 en tiempo constante, despacho atómico vía `env.WHATSAPP_INBOUND_QUEUE.sendBatch(...)` y respuesta HTTP 200 inmediata tras confirmación de cola.

## Ver también

- [Whatsapp Service](/docs/comunicaciones/whatsapp/servicio.md)
- [WhatsApp Service Worker](/src/docs/comunicaciones/whatsapp/service.md)
- [Triage de Inbound WhatsApp](/docs/comunicaciones/whatsapp/inbound_triage.md)
- [WhatsApp Outbound Pipeline](/src/docs/comunicaciones/whatsapp/outbound-pipeline.md)
- [Queues](/src/docs/arquitectura/infra/queues.md)
