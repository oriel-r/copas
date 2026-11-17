import { getProxyLogger } from '../observability/logger.ts'
import type { MetaContact } from '../types.ts'

export class WahaRequestError extends Error {
  readonly status: number
  readonly metaCode: number
  readonly retryable: boolean

  constructor(status: number, metaCode: number, message: string, retryable: boolean) {
    super(message)
    this.name = 'WahaRequestError'
    this.status = status
    this.metaCode = metaCode
    this.retryable = retryable
  }
}

export type WahaSessionStatus = {
  name: string
  status: string
}

export class WahaClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly logger = getProxyLogger('waha-client')

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.apiKey = apiKey
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey
    }
    return headers
  }

  private async requestJson<T>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs = 15000,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const start = performance.now()
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: this.headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (err: any) {
      const durationMs = Math.round((performance.now() - start) * 100) / 100
      const errorMsg = `WAHA network/timeout error: ${err?.message || String(err)}`
      this.logger.error('WAHA {method} {path} failed in {durationMs}ms: {error}', {
        method,
        path,
        durationMs,
        error: errorMsg,
      })
      throw new WahaRequestError(503, 2, errorMsg, true)
    }

    const durationMs = Math.round((performance.now() - start) * 100) / 100
    const rawText = await response.text()
    let data: any = {}
    if (rawText) {
      try {
        data = JSON.parse(rawText)
      } catch {
        data = { message: rawText }
      }
    }

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500
      const msg = data?.message || data?.error || `WAHA HTTP ${response.status}`
      const metaCode = response.status === 401 || response.status === 403 ? 190 : retryable ? 2 : 131026
      this.logger.warn('WAHA {method} {path} returned HTTP {status} in {durationMs}ms: {error}', {
        method,
        path,
        status: response.status,
        durationMs,
        retryable,
        error: msg,
      })
      throw new WahaRequestError(response.status, metaCode, msg, retryable)
    }

    this.logger.debug('WAHA {method} {path} -> HTTP {status} in {durationMs}ms', {
      method,
      path,
      status: response.status,
      durationMs,
    })

    return data as T
  }

  async listSessions(): Promise<{
    reachable: boolean
    sessions: WahaSessionStatus[]
    error?: string
  }> {
    try {
      const res = await this.requestJson<WahaSessionStatus[]>('GET', '/api/sessions?all=true', undefined, 3000)
      return {
        reachable: true,
        sessions: Array.isArray(res) ? res.map((s) => ({ name: s.name, status: s.status })) : [],
      }
    } catch (err: any) {
      return {
        reachable: false,
        sessions: [],
        error: err?.message || String(err),
      }
    }
  }

  async getSession(session: string): Promise<WahaSessionStatus | null> {
    try {
      return await this.requestJson<WahaSessionStatus>(
        'GET',
        `/api/sessions/${encodeURIComponent(session)}`,
        undefined,
        4000,
      )
    } catch (err: any) {
      if (err instanceof WahaRequestError && err.status === 404) {
        return null
      }
      throw err
    }
  }

  async checkNumberExists(
    session: string,
    digits: string,
  ): Promise<{ numberExists: boolean; chatId?: string }> {
    const qs = new URLSearchParams({ phone: digits, session })
    return this.requestJson<{ numberExists: boolean; chatId?: string }>(
      'GET',
      `/api/contacts/check-exists?${qs.toString()}`,
      undefined,
      8000,
    )
  }

  async resolveChatId(session: string, digits: string, verifyExists: boolean): Promise<string> {
    if (!verifyExists) {
      return `${digits}@c.us`
    }

    const candidates = [digits]
    if (digits.startsWith('549') && digits.length >= 12) {
      candidates.push(`54${digits.slice(3)}`)
    } else if (digits.startsWith('54') && !digits.startsWith('549') && digits.length >= 11) {
      candidates.push(`549${digits.slice(2)}`)
    }

    for (const candidate of candidates) {
      try {
        const res = await this.checkNumberExists(session, candidate)
        if (res?.numberExists) {
          return res.chatId || `${candidate}@c.us`
        }
      } catch (err: any) {
        if (err instanceof WahaRequestError && err.retryable) {
          throw err
        }
      }
    }

    throw new WahaRequestError(
      400,
      131026,
      `Recipient phone ${digits} is not registered on WhatsApp`,
      false,
    )
  }

  async sendSeen(session: string, chatId: string): Promise<void> {
    try {
      await this.requestJson('POST', '/api/sendSeen', { session, chatId }, 5000)
    } catch {
      // Best-effort presence step
    }
  }

  async startTyping(session: string, chatId: string): Promise<void> {
    try {
      await this.requestJson('POST', '/api/startTyping', { session, chatId }, 5000)
    } catch {
      // Best-effort presence step
    }
  }

  async stopTyping(session: string, chatId: string): Promise<void> {
    try {
      await this.requestJson('POST', '/api/stopTyping', { session, chatId }, 5000)
    } catch {
      // Best-effort presence step
    }
  }

  async sendText(session: string, chatId: string, text: string): Promise<string> {
    const res = await this.requestJson<any>('POST', '/api/sendText', {
      session,
      chatId,
      text,
    })
    return extractWahaMessageId(res)
  }

  async sendReaction(
    session: string,
    chatId: string,
    messageId: string,
    reaction: string,
  ): Promise<string> {
    try {
      const res = await this.requestJson<any>('PUT', '/api/reaction', {
        session,
        chatId,
        messageId,
        reaction,
      })
      return extractWahaMessageId(res)
    } catch (err: any) {
      if (err instanceof WahaRequestError && (err.status === 404 || err.status === 405)) {
        const res = await this.requestJson<any>('POST', '/api/reaction', {
          session,
          chatId,
          messageId,
          reaction,
        })
        return extractWahaMessageId(res)
      }
      throw err
    }
  }

  async sendContactVcard(
    session: string,
    chatId: string,
    contact: MetaContact,
    fallbackText: string,
  ): Promise<string> {
    const fullName =
      contact.name?.formatted_name ||
      [contact.name?.first_name, contact.name?.last_name].filter(Boolean).join(' ') ||
      'Contacto'
    const primaryPhone = contact.phones?.[0]?.phone || ''

    try {
      const res = await this.requestJson<any>('POST', '/api/sendContactVcard', {
        session,
        chatId,
        contacts: [
          {
            fullName,
            phoneNumber: primaryPhone,
            whatsappId: primaryPhone.replace(/\D/g, ''),
          },
        ],
      })
      return extractWahaMessageId(res)
    } catch (err: any) {
      if (err instanceof WahaRequestError && !err.retryable) {
        return this.sendText(session, chatId, fallbackText)
      }
      throw err
    }
  }
}

export function extractWahaMessageId(res: any): string {
  const id =
    res?.id ||
    res?.key?.id ||
    res?._data?.id?._serialized ||
    res?.message?.id
  if (typeof id === 'string' && id.trim()) {
    return id.trim()
  }
  return `waha_${crypto.randomUUID()}`
}
