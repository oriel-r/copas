import { randomInt } from 'node:crypto'
import type { ProxyConfig } from '../config.ts'
import type { ProxyStore } from '../db/store.ts'
import { getProxyLogger, withProxyLogContext } from '../observability/logger.ts'
import type { OutboundAction, OutboundJobRow } from '../types.ts'
import { WahaClient, WahaRequestError } from '../waha/client.ts'
import type { WebhookEmulator } from '../webhooks/emulator.ts'

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomBetween(minMs: number, maxMs: number): number {
  const low = Math.max(0, Math.min(minMs, maxMs))
  const high = Math.max(low, maxMs)
  if (low === high) return low
  return randomInt(low, high + 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export type WorkerRuntimeState = {
  activeSessions: string[]
  pendingWakeups: string[]
  lastSentAtBySession: Record<string, number>
}

export class HumanDispatcher {
  private readonly config: ProxyConfig
  private readonly store: ProxyStore
  private readonly waha: WahaClient
  private readonly webhooks: WebhookEmulator
  private readonly activeLoops = new Map<string, Promise<void>>()
  private readonly pendingWakeups = new Set<string>()
  private readonly lastSentAt = new Map<string, number>()
  private readonly logger = getProxyLogger('dispatcher')

  constructor(
    config: ProxyConfig,
    store: ProxyStore,
    waha: WahaClient,
    webhooks: WebhookEmulator,
  ) {
    this.config = config
    this.store = store
    this.waha = waha
    this.webhooks = webhooks
  }

  getWorkerRuntimeState(): WorkerRuntimeState {
    return {
      activeSessions: Array.from(this.activeLoops.keys()),
      pendingWakeups: Array.from(this.pendingWakeups),
      lastSentAtBySession: Object.fromEntries(this.lastSentAt.entries()),
    }
  }

  recoverPendingSessions(): void {
    const sessions = this.store.listSessionsWithQueuedJobs()
    if (sessions.length > 0) {
      this.logger.info('Recovering pending queued jobs for sessions: {sessions}', {
        sessions,
      })
    }
    for (const session of sessions) {
      this.triggerSession(session)
    }
  }

  triggerSession(wahaSession: string): void {
    if (this.activeLoops.has(wahaSession)) {
      this.pendingWakeups.add(wahaSession)
      return
    }

    const loopPromise = this.runSessionLoop(wahaSession).finally(() => {
      this.activeLoops.delete(wahaSession)
      if (this.pendingWakeups.has(wahaSession)) {
        this.pendingWakeups.delete(wahaSession)
        this.triggerSession(wahaSession)
      }
    })

    this.activeLoops.set(wahaSession, loopPromise)
  }

  async waitIdle(): Promise<void> {
    while (this.activeLoops.size > 0) {
      await Promise.all(Array.from(this.activeLoops.values()))
    }
  }

  private async runSessionLoop(wahaSession: string): Promise<void> {
    this.logger.debug('Session worker loop started for {wahaSession}', { wahaSession })
    while (true) {
      const job = this.store.claimNextQueuedJob(wahaSession)
      if (!job) break

      await this.processJob(job)
    }
    this.logger.debug('Session worker loop idle for {wahaSession}', { wahaSession })
  }

  private async enforceCooldown(job: OutboundJobRow): Promise<void> {
    const lastTs = this.lastSentAt.get(job.waha_session)
    if (!lastTs) return

    const targetCooldown = randomBetween(
      this.config.humanMinCooldownMs,
      this.config.humanMaxCooldownMs,
    )
    const elapsed = Date.now() - lastTs
    if (elapsed < targetCooldown) {
      const waitMs = targetCooldown - elapsed
      this.logger.info(
        'Applying human cooldown of {waitMs}ms before sending {wamid} on session {wahaSession}',
        {
          waitMs,
          wamid: job.wamid,
          wahaSession: job.waha_session,
        },
      )
      this.store.recordEvent({
        level: 'info',
        category: 'dispatcher',
        wahaSession: job.waha_session,
        wamid: job.wamid,
        jobId: job.id,
        eventType: 'cooldown_wait',
        message: `Waiting ${waitMs}ms anti-burst cooldown`,
        details: { waitMs, targetCooldown },
      })
      await sleep(waitMs)
    }
  }

  private computeTypingDurationMs(text: string): number {
    const base = text.length * this.config.humanTypingMsPerChar
    const jitter = randomBetween(-400, 900)
    return clamp(
      base + jitter,
      this.config.humanMinTypingMs,
      this.config.humanMaxTypingMs,
    )
  }

  private async executeJobAction(job: OutboundJobRow): Promise<string> {
    const action = JSON.parse(job.payload_json) as OutboundAction
    const chatId = await this.waha.resolveChatId(
      job.waha_session,
      job.recipient_phone,
      this.config.wahaCheckNumberExists,
    )

    this.logger.debug('Resolved chatId {chatId} for {wamid}', {
      chatId,
      wamid: job.wamid,
    })
    this.store.recordEvent({
      level: 'debug',
      category: 'dispatcher',
      wahaSession: job.waha_session,
      wamid: job.wamid,
      jobId: job.id,
      eventType: 'chat_id_resolved',
      message: `Resolved chatId ${chatId}`,
      details: { chatId, verifyExists: this.config.wahaCheckNumberExists },
    })

    if (action.kind === 'reaction') {
      const mapping = this.store.findMappingByWamid(action.targetMessageId)
      const targetWahaId = mapping?.waha_message_id || action.targetMessageId
      return this.waha.sendReaction(job.waha_session, chatId, targetWahaId, action.emoji)
    }

    if (action.kind === 'contact') {
      return this.waha.sendContactVcard(
        job.waha_session,
        chatId,
        action.contact,
        action.fallbackText,
      )
    }

    await this.waha.startTyping(job.waha_session, chatId)
    try {
      const typingMs = this.computeTypingDurationMs(action.text)
      this.logger.info(
        'Simulating typing for {typingMs}ms ({chars} chars) to {chatId}',
        {
          typingMs,
          chars: action.text.length,
          chatId,
        },
      )
      this.store.recordEvent({
        level: 'info',
        category: 'dispatcher',
        wahaSession: job.waha_session,
        wamid: job.wamid,
        jobId: job.id,
        eventType: 'typing_simulation',
        message: `Typing simulation for ${typingMs}ms (${action.text.length} chars)`,
        details: { typingMs, chars: action.text.length, chatId },
      })
      await sleep(typingMs)
    } finally {
      await this.waha.stopTyping(job.waha_session, chatId)
    }

    return this.waha.sendText(job.waha_session, chatId, action.text)
  }

  private async processJob(job: OutboundJobRow): Promise<void> {
    await withProxyLogContext(
      {
        jobId: job.id,
        wamid: job.wamid,
        wahaSession: job.waha_session,
        phoneNumberId: job.phone_number_id,
        recipientPhone: job.recipient_phone,
        attempt: job.attempts,
      },
      async () => {
        const start = performance.now()
        this.logger.info(
          'Claimed outbound job {jobId} ({wamid}) for {recipientPhone} on session {wahaSession} [attempt {attempt}]',
          {
            jobId: job.id,
            wamid: job.wamid,
            recipientPhone: job.recipient_phone,
            wahaSession: job.waha_session,
            attempt: job.attempts,
            actionType: job.action_type,
          },
        )
        this.store.recordEvent({
          level: 'info',
          category: 'dispatcher',
          wahaSession: job.waha_session,
          wamid: job.wamid,
          jobId: job.id,
          eventType: 'job_claimed',
          message: `Claimed job attempt ${job.attempts} (${job.action_type})`,
          details: { attempt: job.attempts, actionType: job.action_type, recipientPhone: job.recipient_phone },
        })

        try {
          await this.enforceCooldown(job)

          const wahaMessageId = await this.executeJobAction(job)
          const durationMs = Math.round((performance.now() - start) * 100) / 100

          this.lastSentAt.set(job.waha_session, Date.now())
          this.store.markJobCompleted(job.id, wahaMessageId)
          this.store.upsertMessageMapping({
            wamid: job.wamid,
            wahaMessageId,
            phoneNumberId: job.phone_number_id,
            wahaSession: job.waha_session,
            recipientPhone: job.recipient_phone,
          })

          this.logger.info(
            'Dispatched {wamid} -> WAHA message {wahaMessageId} in {durationMs}ms',
            {
              wamid: job.wamid,
              wahaMessageId,
              durationMs,
            },
          )
          this.store.recordEvent({
            level: 'info',
            category: 'dispatcher',
            wahaSession: job.waha_session,
            wamid: job.wamid,
            jobId: job.id,
            eventType: 'waha_dispatched',
            message: `Dispatched to WAHA (${wahaMessageId}) in ${durationMs}ms`,
            details: { wahaMessageId, durationMs, actionType: job.action_type },
          })
        } catch (err: any) {
          const message = err?.message || String(err)
          const isRetryable = err instanceof WahaRequestError ? err.retryable : true
          const metaCode = err instanceof WahaRequestError ? err.metaCode : 131026

          if (isRetryable && job.attempts < this.config.maxSendRetries) {
            const retryWaitMs = Math.min(30000, 2000 * 2 ** (job.attempts - 1))
            this.logger.warn(
              'Transient error dispatching {wamid} (attempt {attempt}/{maxRetries}), retrying in {retryWaitMs}ms: {error}',
              {
                wamid: job.wamid,
                attempt: job.attempts,
                maxRetries: this.config.maxSendRetries,
                retryWaitMs,
                error: message,
              },
            )
            this.store.requeueJobForRetry(job.id, message)
            this.store.recordEvent({
              level: 'warning',
              category: 'dispatcher',
              wahaSession: job.waha_session,
              wamid: job.wamid,
              jobId: job.id,
              eventType: 'job_retry',
              message: `Retry scheduled in ${retryWaitMs}ms: ${message}`,
              details: { attempt: job.attempts, maxRetries: this.config.maxSendRetries, retryWaitMs, error: message },
            })
            await sleep(retryWaitMs)
            return
          }

          this.logger.error(
            'Permanent failure dispatching {wamid} on attempt {attempt}: {error}',
            {
              wamid: job.wamid,
              attempt: job.attempts,
              metaCode,
              error: message,
            },
          )
          this.store.markJobFailed(job.id, message)
          this.store.recordEvent({
            level: 'error',
            category: 'dispatcher',
            wahaSession: job.waha_session,
            wamid: job.wamid,
            jobId: job.id,
            eventType: 'job_failed',
            message: `Failed permanently: ${message}`,
            details: { attempt: job.attempts, metaCode, error: message },
          })

          try {
            await this.webhooks.emitStatusWebhook({
              wamid: job.wamid,
              phoneNumberId: job.phone_number_id,
              recipientPhone: job.recipient_phone,
              status: 'failed',
              error: {
                code: metaCode,
                title: 'WahaDispatchFailed',
                message,
              },
            })
          } catch (webhookErr: any) {
            this.logger.error(
              'Failed to emit failed-status webhook for {wamid}: {error}',
              {
                wamid: job.wamid,
                error: webhookErr?.message || String(webhookErr),
              },
            )
          }
        }
      },
    )
  }
}
