import { loadSessionsConfig, resolvePhoneMetadataByWahaSession, type ProxyConfig } from '../config.ts'
import type { ProxyStore } from '../db/store.ts'
import { getProxyLogger } from '../observability/logger.ts'
import { signMetaWebhookPayload } from '../security/auth.ts'
import type { MetaWebhookPayload, WahaWebhookEvent } from '../types.ts'

function mapWahaAckToMetaStatus(ack: number): 'sent' | 'delivered' | 'read' | 'failed' | null {
  if (ack === -1) return 'failed'
  if (ack === 1) return 'sent'
  if (ack === 2) return 'delivered'
  if (ack === 3 || ack === 4) return 'read'
  return null
}

function extractPhoneDigitsFromJid(jid: string | undefined): string {
  if (!jid) return ''
  const localPart = jid.split('@')[0] || ''
  return localPart.replace(/\D/g, '')
}

function isIgnoredChatJid(jid: string | undefined): boolean {
  if (!jid) return true
  return (
    jid.endsWith('@g.us') ||
    jid.endsWith('@newsletter') ||
    jid === 'status@broadcast'
  )
}

function detectInboundMessageType(payload: Record<string, unknown>): string {
  if (!payload.hasMedia) return 'text'
  const media = payload.media as Record<string, unknown> | undefined
  const mime = String(media?.mimetype || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

export class WebhookEmulator {
  private readonly config: ProxyConfig
  private readonly store: ProxyStore
  private readonly logger = getProxyLogger('webhooks')

  constructor(config: ProxyConfig, store: ProxyStore) {
    this.config = config
    this.store = store
  }

  private async postSignedMetaWebhook(
    payload: MetaWebhookPayload,
    auditMeta: { wahaSession?: string; wamid?: string; kind: string },
  ): Promise<boolean> {
    if (!this.config.copasWebhookUrl) {
      this.logger.debug('COPAS_WEBHOOK_URL is not configured; skipping {kind} webhook', auditMeta)
      return false
    }
    if (!this.config.metaAppSecret) {
      this.logger.warn('META_APP_SECRET is empty; skipping signed {kind} webhook dispatch', auditMeta)
      return false
    }

    const rawBody = JSON.stringify(payload)
    const signature = signMetaWebhookPayload(rawBody, this.config.metaAppSecret)
    const start = performance.now()

    let response: Response
    try {
      response = await fetch(this.config.copasWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': signature,
        },
        body: rawBody,
        signal: AbortSignal.timeout(10000),
      })
    } catch (err: any) {
      const durationMs = Math.round((performance.now() - start) * 100) / 100
      const errorMsg = err?.message || String(err)
      this.logger.error('Failed posting {kind} webhook to CoPAS in {durationMs}ms: {error}', {
        ...auditMeta,
        durationMs,
        error: errorMsg,
      })
      this.store.recordEvent({
        level: 'error',
        category: 'webhooks',
        wahaSession: auditMeta.wahaSession,
        wamid: auditMeta.wamid,
        eventType: 'copas_webhook_failed',
        message: `Network error posting ${auditMeta.kind} webhook: ${errorMsg}`,
        details: { durationMs, kind: auditMeta.kind, error: errorMsg },
      })
      return false
    }

    const durationMs = Math.round((performance.now() - start) * 100) / 100

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      this.logger.error(
        'CoPAS webhook returned HTTP {status} for {kind} in {durationMs}ms: {error}',
        {
          ...auditMeta,
          status: response.status,
          durationMs,
          error: errText,
        },
      )
      this.store.recordEvent({
        level: 'error',
        category: 'webhooks',
        wahaSession: auditMeta.wahaSession,
        wamid: auditMeta.wamid,
        eventType: 'copas_webhook_failed',
        message: `CoPAS returned HTTP ${response.status} for ${auditMeta.kind}`,
        details: { status: response.status, durationMs, kind: auditMeta.kind, error: errText },
      })
      return false
    }

    this.logger.info('Forwarded {kind} webhook to CoPAS in {durationMs}ms (HTTP {status})', {
      ...auditMeta,
      status: response.status,
      durationMs,
    })
    this.store.recordEvent({
      level: 'info',
      category: 'webhooks',
      wahaSession: auditMeta.wahaSession,
      wamid: auditMeta.wamid,
      eventType: 'copas_webhook_sent',
      message: `Forwarded ${auditMeta.kind} webhook (HTTP ${response.status})`,
      details: { status: response.status, durationMs, kind: auditMeta.kind },
    })

    return true
  }

  async emitStatusWebhook(params: {
    wamid: string
    phoneNumberId: string
    displayPhone?: string
    recipientPhone: string
    status: 'sent' | 'delivered' | 'read' | 'failed'
    timestampSec?: number
    wahaSession?: string
    error?: { code: number; title: string; message?: string }
  }): Promise<boolean> {
    const statusObj: Record<string, unknown> = {
      id: params.wamid,
      status: params.status,
      timestamp: String(params.timestampSec ?? Math.floor(Date.now() / 1000)),
      recipient_id: params.recipientPhone,
    }

    if (params.error) {
      statusObj.errors = [
        {
          code: params.error.code,
          title: params.error.title,
          message: params.error.message,
        },
      ]
    }

    const metaPayload: MetaWebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: this.config.metaWabaId,
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: params.displayPhone || params.phoneNumberId,
                  phone_number_id: params.phoneNumberId,
                },
                statuses: [statusObj],
              },
            },
          ],
        },
      ],
    }

    return this.postSignedMetaWebhook(metaPayload, {
      wahaSession: params.wahaSession,
      wamid: params.wamid,
      kind: `status:${params.status}`,
    })
  }

  async handleWahaWebhook(
    event: WahaWebhookEvent,
  ): Promise<{ forwarded: boolean; reason?: string }> {
    const sessionsConfig = loadSessionsConfig(this.config.sessionsConfigPath)
    const { phoneNumberId, displayPhone } = resolvePhoneMetadataByWahaSession(
      event.session,
      this.config,
      sessionsConfig,
    )
    const payload = event.payload ?? {}

    if (event.event === 'message.ack') {
      /** Collects serialized and raw stanza IDs so NOWEB ACKs match stored sendText IDs. */
      const extractAckMessageIdCandidates = (ackPayload: Record<string, unknown>): string[] => {
        const seen = new Set<string>()
        const addCandidate = (value: unknown): void => {
          if (typeof value !== 'string') return
          const trimmed = value.trim()
          if (!trimmed) return
          seen.add(trimmed)
        }

        addCandidate(ackPayload.id)

        const rawData = ackPayload._data
        if (typeof rawData === 'object' && rawData !== null) {
          const rawKey = (rawData as Record<string, unknown>).key
          if (typeof rawKey === 'object' && rawKey !== null) {
            addCandidate((rawKey as Record<string, unknown>).id)
          }
        }

        if (typeof ackPayload.id === 'string') {
          const serializedMatch = /^(?:true|false)_[^_]+_(.+)$/.exec(ackPayload.id.trim())
          if (serializedMatch?.[1]) {
            addCandidate(serializedMatch[1])
          }
        }

        return Array.from(seen)
      }

      const candidates = extractAckMessageIdCandidates(payload)
      const wahaMessageId = candidates[0] ?? ''
      const ack = typeof payload.ack === 'number' ? payload.ack : Number.NaN
      const mappedStatus = mapWahaAckToMetaStatus(ack)

      if (!wahaMessageId || !mappedStatus) {
        this.logger.debug('Ignoring WAHA message.ack ({wahaMessageId}, ack={ack})', {
          wahaSession: event.session,
          wahaMessageId,
          ack,
        })
        return { forwarded: false, reason: 'ignored_ack' }
      }

      const findMapping = () => {
        for (const candidate of candidates) {
          const found = this.store.findMappingByWahaMessageId(candidate)
          if (found) return found
        }
        return null
      }
      const mapping = findMapping()

      if (!mapping) {
        this.logger.debug('Unmapped WAHA ack for {wahaMessageId} (ack={ack})', {
          wahaSession: event.session,
          wahaMessageId,
          ack,
        })
        return { forwarded: false, reason: 'unmapped_message' }
      }

      this.logger.info(
        'WAHA ack received: {wahaMessageId} -> {wamid} mapped to {mappedStatus}',
        {
          wahaSession: event.session,
          wahaMessageId,
          wamid: mapping.wamid,
          ack,
          mappedStatus,
        },
      )
      this.store.recordEvent({
        level: 'info',
        category: 'webhooks',
        wahaSession: event.session,
        wamid: mapping.wamid,
        eventType: 'waha_ack_received',
        message: `WAHA ack=${ack} -> ${mappedStatus}`,
        details: { wahaMessageId, ack, mappedStatus },
      })

      const forwarded = await this.emitStatusWebhook({
        wamid: mapping.wamid,
        phoneNumberId: mapping.phone_number_id || phoneNumberId,
        displayPhone,
        recipientPhone: mapping.recipient_phone,
        status: mappedStatus,
        wahaSession: event.session,
        error:
          mappedStatus === 'failed'
            ? {
                code: 131026,
                title: 'MessageUndeliverable',
                message: `WAHA ack=${ack}`,
              }
            : undefined,
      })

      return { forwarded }
    }

    if (event.event === 'message') {
      if (payload.fromMe === true) {
        return { forwarded: false, reason: 'outbound_echo' }
      }

      const fromJid = typeof payload.from === 'string' ? payload.from : ''
      if (isIgnoredChatJid(fromJid)) {
        return { forwarded: false, reason: 'ignored_chat_type' }
      }

      const rawData = (payload._data as Record<string, unknown> | undefined) ?? {}
      const rawKey = (rawData.key as Record<string, unknown> | undefined) ?? {}
      const remoteJidAlt = typeof rawKey.remoteJidAlt === 'string' ? rawKey.remoteJidAlt : ''
      const senderPn = typeof rawKey.senderPn === 'string' ? rawKey.senderPn : ''
      const effectiveSenderJid =
        fromJid.endsWith('@lid') && (remoteJidAlt || senderPn)
          ? remoteJidAlt || senderPn
          : fromJid

      const fromDigits = extractPhoneDigitsFromJid(effectiveSenderJid)
      if (!fromDigits) {
        return { forwarded: false, reason: 'missing_sender_digits' }
      }

      const msgId =
        typeof payload.id === 'string' && payload.id
          ? payload.id
          : `waha_in_${crypto.randomUUID()}`
      const timestampSec =
        typeof payload.timestamp === 'number'
          ? Math.floor(payload.timestamp)
          : Math.floor(Date.now() / 1000)

      const senderName =
        (typeof rawData.notifyName === 'string' && rawData.notifyName) ||
        (typeof rawData.pushName === 'string' && rawData.pushName) ||
        (typeof payload.notifyName === 'string' && payload.notifyName) ||
        (typeof payload.pushName === 'string' && payload.pushName) ||
        fromDigits

      const msgType = detectInboundMessageType(payload)
      const bodyText = typeof payload.body === 'string' ? payload.body : ''

      this.logger.info(
        'WAHA inbound message {msgId} from {fromDigits} ({msgType}) on session {wahaSession}',
        {
          wahaSession: event.session,
          msgId,
          fromDigits,
          msgType,
        },
      )
      this.store.recordEvent({
        level: 'info',
        category: 'webhooks',
        wahaSession: event.session,
        wamid: msgId,
        eventType: 'waha_inbound_received',
        message: `Inbound ${msgType} message from ${fromDigits}`,
        details: { fromDigits, msgType, hasMedia: Boolean(payload.hasMedia) },
      })

      const metaMsg: Record<string, unknown> = {
        id: msgId,
        from: fromDigits,
        timestamp: String(timestampSec),
        type: msgType,
      }

      if (msgType === 'text') {
        metaMsg.text = { body: bodyText }
      } else {
        const media = (payload.media as Record<string, unknown> | undefined) ?? {}
        metaMsg[msgType] = {
          id: msgId,
          mime_type: typeof media.mimetype === 'string' ? media.mimetype : 'application/octet-stream',
          caption: bodyText || undefined,
          filename: typeof media.filename === 'string' ? media.filename : undefined,
        }
      }

      const metaPayload: MetaWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: this.config.metaWabaId,
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: displayPhone,
                    phone_number_id: phoneNumberId,
                  },
                  contacts: [
                    {
                      profile: { name: senderName },
                      wa_id: fromDigits,
                    },
                  ],
                  messages: [metaMsg],
                },
              },
            ],
          },
        ],
      }

      const forwarded = await this.postSignedMetaWebhook(metaPayload, {
        wahaSession: event.session,
        wamid: msgId,
        kind: `inbound:${msgType}`,
      })
      return { forwarded }
    }

    if (event.event === 'session.status') {
      const sessionStatus = typeof payload.status === 'string' ? payload.status : 'unknown'
      this.logger.info('WAHA session {wahaSession} status changed to {sessionStatus}', {
        wahaSession: event.session,
        sessionStatus,
      })
      this.store.recordEvent({
        level: sessionStatus === 'FAILED' || sessionStatus === 'STOPPED' ? 'warning' : 'info',
        category: 'webhooks',
        wahaSession: event.session,
        eventType: 'waha_session_status',
        message: `WAHA session status: ${sessionStatus}`,
        details: { status: sessionStatus },
      })
      return { forwarded: false, reason: 'session_status_logged' }
    }

    return { forwarded: false, reason: `unhandled_event:${event.event}` }
  }
}
