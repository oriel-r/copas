import { loadSessionsConfig, resolvePhoneMetadataByWahaSession, type ProxyConfig } from '../config.ts'
import type { ProxyStore } from '../db/store.ts'
import { getProxyLogger } from '../observability/logger.ts'
import { signMetaWebhookPayload } from '../security/auth.ts'
import type { MetaWebhookPayload, WahaWebhookEvent } from '../types.ts'
import type { WahaClient } from '../waha/client.ts'

export type ChannelConnectionStatus = 'connected' | 'waiting_qr' | 'disconnected' | 'error'

export function mapWahaStatusToChannelStatus(wahaStatus: string | undefined): ChannelConnectionStatus | null {
  const norm = (wahaStatus || '').trim().toUpperCase()
  if (norm === 'WORKING') return 'connected'
  if (norm === 'SCAN_QR_CODE' || norm === 'STARTING') return 'waiting_qr'
  if (norm === 'STOPPED') return 'disconnected'
  if (norm === 'FAILED') return 'error'
  return null
}

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

  async emitChannelStatusWebhook(params: {
    wahaSession: string
    wahaStatus: string
    meId?: string
    timestampSec?: number
  }): Promise<{ forwarded: boolean; reason?: string }> {
    if (!this.config.copasApiStatusWebhookUrl) {
      this.logger.debug('COPAS_API_STATUS_WEBHOOK_URL is not configured; skipping channel status push', {
        wahaSession: params.wahaSession,
        wahaStatus: params.wahaStatus,
      })
      return { forwarded: false, reason: 'status_webhook_not_configured' }
    }
    if (!this.config.copasStatusWebhookSecret) {
      this.logger.warn('COPAS_STATUS_WEBHOOK_SECRET is empty; skipping signed channel status push', {
        wahaSession: params.wahaSession,
        wahaStatus: params.wahaStatus,
      })
      return { forwarded: false, reason: 'status_webhook_secret_missing' }
    }

    const mappedStatus = mapWahaStatusToChannelStatus(params.wahaStatus)
    if (!mappedStatus) {
      return { forwarded: false, reason: 'unmapped_session_status' }
    }

    const sessionsConfig = loadSessionsConfig(this.config.sessionsConfigPath)
    const { phoneNumberId, displayPhone } = resolvePhoneMetadataByWahaSession(
      params.wahaSession,
      this.config,
      sessionsConfig,
    )

    const displayDigits = displayPhone.replace(/\D/g, '')
    const meDigits = extractPhoneDigitsFromJid(params.meId)
    const effectivePhone = displayDigits.length >= 6 ? displayDigits : meDigits
    if (effectivePhone.length < 6) {
      this.logger.debug('Skipping channel status push for unmapped session {wahaSession}', {
        wahaSession: params.wahaSession,
        wahaStatus: params.wahaStatus,
      })
      return { forwarded: false, reason: 'missing_phone_number' }
    }

    const effectivePhoneNumberId =
      phoneNumberId && phoneNumberId !== 'default' && phoneNumberId !== params.wahaSession
        ? phoneNumberId
        : effectivePhone

    const rawBody = JSON.stringify({
      phoneNumber: effectivePhone,
      phoneNumberId: effectivePhoneNumberId,
      status: mappedStatus,
      timestamp: params.timestampSec ?? Math.floor(Date.now() / 1000),
    })
    const signature = signMetaWebhookPayload(rawBody, this.config.copasStatusWebhookSecret)

    const retryDelaysMs = [0, 400, 1200]
    let lastErrorMsg = ''
    let lastStatus = 0

    for (let attempt = 0; attempt < retryDelaysMs.length; attempt++) {
      if (retryDelaysMs[attempt] > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]))
      }

      const start = performance.now()
      try {
        const response = await fetch(this.config.copasApiStatusWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
          body: rawBody,
          signal: AbortSignal.timeout(10000),
        })
        const durationMs = Math.round((performance.now() - start) * 100) / 100
        lastStatus = response.status

        if (response.ok) {
          this.logger.info(
            'Forwarded channel status {mappedStatus} for {effectivePhone} to CoPAS API in {durationMs}ms (HTTP {status})',
            {
              wahaSession: params.wahaSession,
              mappedStatus,
              effectivePhone,
              status: response.status,
              durationMs,
            },
          )
          this.store.recordEvent({
            level: 'info',
            category: 'webhooks',
            wahaSession: params.wahaSession,
            eventType: 'copas_channel_status_sent',
            message: `Forwarded channel status ${mappedStatus} for ${effectivePhone} (HTTP ${response.status})`,
            details: {
              mappedStatus,
              phoneNumber: effectivePhone,
              phoneNumberId: effectivePhoneNumberId,
              status: response.status,
              durationMs,
            },
          })
          return { forwarded: true }
        }

        lastErrorMsg = await response.text().catch(() => '')
        const shouldRetry = response.status === 429 || response.status >= 500
        if (!shouldRetry || attempt === retryDelaysMs.length - 1) {
          this.logger.warn(
            'CoPAS API rejected channel status {mappedStatus} for {effectivePhone} (HTTP {status}): {error}',
            {
              wahaSession: params.wahaSession,
              mappedStatus,
              effectivePhone,
              status: response.status,
              error: lastErrorMsg,
            },
          )
          this.store.recordEvent({
            level: response.status === 404 ? 'warning' : 'error',
            category: 'webhooks',
            wahaSession: params.wahaSession,
            eventType: 'copas_channel_status_failed',
            message: `CoPAS API returned HTTP ${response.status} for channel status ${mappedStatus}`,
            details: {
              mappedStatus,
              phoneNumber: effectivePhone,
              status: response.status,
              durationMs,
              error: lastErrorMsg,
            },
          })
          return { forwarded: false, reason: `http_${response.status}` }
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || String(err)
        if (attempt === retryDelaysMs.length - 1) {
          this.logger.error('Failed posting channel status {mappedStatus} to CoPAS API: {error}', {
            wahaSession: params.wahaSession,
            mappedStatus,
            effectivePhone,
            error: lastErrorMsg,
          })
          this.store.recordEvent({
            level: 'error',
            category: 'webhooks',
            wahaSession: params.wahaSession,
            eventType: 'copas_channel_status_failed',
            message: `Network error posting channel status ${mappedStatus}: ${lastErrorMsg}`,
            details: {
              mappedStatus,
              phoneNumber: effectivePhone,
              error: lastErrorMsg,
            },
          })
          return { forwarded: false, reason: 'network_error' }
        }
      }
    }

    return { forwarded: false, reason: lastStatus ? `http_${lastStatus}` : 'network_error' }
  }

  async syncAllSessionsStatus(waha: WahaClient): Promise<{
    reachable: boolean
    total: number
    forwarded: number
    skipped: number
    failed: number
  }> {
    const list = await waha.listSessions()
    if (!list.reachable) {
      return { reachable: false, total: 0, forwarded: 0, skipped: 0, failed: 0 }
    }

    let forwarded = 0
    let skipped = 0
    let failed = 0

    for (const s of list.sessions) {
      const detail = await waha.getSessionDetail(s.name).catch(() => null)
      const res = await this.emitChannelStatusWebhook({
        wahaSession: s.name,
        wahaStatus: detail?.status || s.status,
        meId: detail?.me?.id,
      })
      if (res.forwarded) {
        forwarded += 1
      } else if (
        res.reason === 'missing_phone_number' ||
        res.reason === 'unmapped_session_status' ||
        res.reason === 'status_webhook_not_configured'
      ) {
        skipped += 1
      } else {
        failed += 1
      }
    }

    return {
      reachable: true,
      total: list.sessions.length,
      forwarded,
      skipped,
      failed,
    }
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
      const meObj = (payload.me as Record<string, unknown> | undefined) ?? undefined
      const meId = typeof meObj?.id === 'string' ? meObj.id : undefined
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
      const pushResult = await this.emitChannelStatusWebhook({
        wahaSession: event.session,
        wahaStatus: sessionStatus,
        meId,
      })
      return {
        forwarded: pushResult.forwarded,
        reason: pushResult.forwarded
          ? 'session_status_forwarded'
          : pushResult.reason || 'session_status_logged',
      }
    }

    return { forwarded: false, reason: `unhandled_event:${event.event}` }
  }
}
