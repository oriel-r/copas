# WAHA Proxy (Emulador de Meta Cloud API)

Stack local (`waha` + `waha-proxy` en Hono) diseñado para exponer envío y recepción de WhatsApp hacia CoPAS mediante **Tailscale Funnel**, manteniendo al core (`api`, `scheduler`, `@copas/db`, `@copas/contracts` y `whatsapp-service`) completamente desacoplado de WAHA.

## Arquitectura

- **`waha` (`devlikeapro/waha`)**: corre en red interna de contenedores (`NOWEB` por defecto, sesiones persistidas en `./data/waha-sessions`). Solo accesible en `127.0.0.1:3000` para escanear QR. Nunca se expone a Tailscale Funnel.
- **`waha-proxy` (Hono + `@hono/node-server` + `node:sqlite`)**:
  - Expone la superficie HTTP de Meta Graph API (`POST /:version/:phoneNumberId/messages`) en `127.0.0.1:8080`.
  - Mapea `phoneNumberId -> wahaSession` desde `config/sessions.json` (1 sesión activa por agencia).
  - Arma los mensajes (`template` desde `config/templates.json`, `text`, `contacts`, `reaction`, `interactive`).
  - Encola por sesión en SQLite (`./data/proxy/proxy.db`), responde `200` inmediato con `wamid.waha.<uuid>` y despacha en segundo plano simulando comportamiento humano (`startTyping` → espera proporcional + jitter → `stopTyping` → `sendText` + cooldown entre mensajes).
  - Traduce webhooks `message.ack` y `message` de WAHA (`X-Webhook-Hmac` SHA-512) a `MetaWebhookPayload` firmado con `X-Hub-Signature-256` (`HMAC-SHA256` usando `META_APP_SECRET`) hacia `whatsapp-service`.
  - Traduce eventos `session.status` de WAHA (`WORKING`, `SCAN_QR_CODE`, `STARTING`, `STOPPED`, `FAILED`) a estados agnósticos (`connected`, `waiting_qr`, `disconnected`, `error`) firmados con `X-Hub-Signature-256` hacia `COPAS_API_STATUS_WEBHOOK_URL` (`api /webhooks/whatsapp-channel-status`) para actualizar el estado de vinculación y enrutamiento por número en CoPAS (incluye sincronización inicial al arrancar y manual vía `POST /qr/sync-status` en el panel `/qr`).

## Puesta en marcha local (Podman o Docker)

1. Copiar variables de entorno y completar los secretos:
   ```bash
   cp .env.example .env
   ```
2. Crear los directorios locales de volúmenes (recomendado en Podman rootless):
   ```bash
   mkdir -p data/waha-sessions data/waha-media data/proxy
   ```
3. Levantar los contenedores:
   - Con **Podman**:
     ```bash
     podman compose up -d --build
     ```
   - Con **Docker**:
     ```bash
     docker compose up -d --build
     ```
4. Vincular la sesión WAHA en `http://127.0.0.1:3000` (escaneando el QR desde el dashboard o `/api/sessions`).
5. Exponer **únicamente** el puerto del proxy (`8080`) vía Tailscale Funnel:
   ```bash
   tailscale serve --https=443 --bg http://127.0.0.1:8080
   tailscale funnel 443 on
   ```
6. Configurar en `whatsapp-service` (Cloudflare Workers):
   - `META_GRAPH_API_BASE_URL=https://<tu-nodo>.<tu-tailnet>.ts.net`
   - `META_APP_SECRET` igual al del `.env` del proxy.
7. Configurar en `api` (D1 `channel_endpoints` / `organization_integrations` o vars `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID`) con el token configurado en `PROXY_BEARER_TOKEN`.

## Observabilidad y Diagnóstico

- **Logs estructurados (`@logtape/logtape`)**:
  - Controlados por `LOG_LEVEL` (`debug` | `info` | `warning` | `error`, por defecto `info`) y `LOG_FORMAT` (`pretty` | `json`, por defecto `pretty`).
  - Cada request y cada job en background propagan `requestId`, `jobId`, `wamid`, `wahaSession` y `recipientPhone` en el contexto.
- **Auditoría persistente en SQLite + Endpoints en tiempo real** (protegidos con `Authorization: Bearer <PROXY_BEARER_TOKEN>`):
  - `GET /observability/status`: estado de la cola por sesión (`queued`, `processing`, `completed`, `failed`), estado en vivo de las sesiones en WAHA, workers activos y configuración de timing humano.
  - `GET /observability/jobs?status=&session=&limit=`: listado de los últimos jobs procesados o en cola.
  - `GET /observability/events?wamid=&session=&limit=`: línea de tiempo detallada por mensaje (`job_enqueued`, `job_claimed`, `cooldown_wait`, `chat_id_resolved`, `typing_simulation`, `waha_dispatched`, `waha_ack_received`, `copas_webhook_sent`, etc.).

  ```bash
  curl -H "Authorization: Bearer <PROXY_BEARER_TOKEN>" http://127.0.0.1:8080/observability/status
  curl -H "Authorization: Bearer <PROXY_BEARER_TOKEN>" "http://127.0.0.1:8080/observability/events?limit=20"
  ```

## Migración a otra PC sin perder sesiones

1. Detener el stack en la PC origen para evitar sesiones duplicadas:
   ```bash
   podman compose down   # o: docker compose down
   ```
2. Copiar la carpeta `./data/` (contiene `.sessions` de WAHA y `proxy.db` con la cola y correlaciones `wamid`) junto con `.env` y `config/` a la nueva PC.
3. Mantener el mismo `WHATSAPP_DEFAULT_ENGINE` (`NOWEB`) y levantar `podman compose up -d` (o `docker compose up -d`) en la nueva PC.
4. Habilitar `tailscale serve` + `tailscale funnel` en la nueva PC y actualizar `META_GRAPH_API_BASE_URL` en `whatsapp-service` si cambió el hostname `.ts.net`.
