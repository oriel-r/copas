import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LogLevel } from '@logtape/logtape'
import type {
  SessionMappingEntry,
  SessionsConfigFile,
  TemplatesConfigFile,
} from './types.ts'

export type ProxyLogFormat = 'pretty' | 'json'

export type ProxyConfig = {
  port: number
  logLevel: LogLevel
  logFormat: ProxyLogFormat
  dbPath: string
  sessionsConfigPath: string
  templatesConfigPath: string
  wahaBaseUrl: string
  wahaApiKey: string
  wahaDefaultSession: string
  wahaWebhookHmacKey: string
  proxyBearerTokens: string[]
  proxyExtraSecret: string
  enableQrPortal: boolean
  qrAdminLocalOnly: boolean
  qrPublicBaseUrl: string
  qrPortalToken: string
  qrInviteSecret: string
  qrInviteDefaultTtlSec: number
  copasWebhookUrl: string
  copasApiStatusWebhookUrl: string
  copasStatusWebhookSecret: string
  metaAppSecret: string
  metaWabaId: string
  wahaCheckNumberExists: boolean
  disconnectedSessionHttpStatus: number
  humanMinCooldownMs: number
  humanMaxCooldownMs: number
  humanTypingMsPerChar: number
  humanMinTypingMs: number
  humanMaxTypingMs: number
  maxSendRetries: number
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  const norm = value.trim().toLowerCase()
  if (norm === 'true' || norm === '1' || norm === 'yes') return true
  if (norm === 'false' || norm === '0' || norm === 'no') return false
  return fallback
}

function parseLogLevel(value: string | undefined): LogLevel {
  const norm = value?.trim().toLowerCase()
  if (norm === 'debug' || norm === 'info' || norm === 'warning' || norm === 'error' || norm === 'fatal') {
    return norm
  }
  return 'info'
}

function parseLogFormat(value: string | undefined): ProxyLogFormat {
  return value?.trim().toLowerCase() === 'json' ? 'json' : 'pretty'
}

export function loadProxyConfig(env: NodeJS.ProcessEnv = process.env): ProxyConfig {
  const tokenListRaw = [env.PROXY_BEARER_TOKENS, env.PROXY_BEARER_TOKEN]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(',')

  const proxyBearerTokens = Array.from(
    new Set(
      tokenListRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  )

  const disconnectedStatus = parseIntEnv(env.DISCONNECTED_SESSION_HTTP_STATUS, 503)

  return {
    port: parseIntEnv(env.PORT, 8080),
    logLevel: parseLogLevel(env.LOG_LEVEL),
    logFormat: parseLogFormat(env.LOG_FORMAT),
    dbPath: env.DB_PATH?.trim() || resolve(process.cwd(), 'data/proxy.db'),
    sessionsConfigPath:
      env.SESSIONS_CONFIG_PATH?.trim() || resolve(process.cwd(), 'config/sessions.json'),
    templatesConfigPath:
      env.TEMPLATES_CONFIG_PATH?.trim() || resolve(process.cwd(), 'config/templates.json'),
    wahaBaseUrl: (env.WAHA_BASE_URL?.trim() || 'http://127.0.0.1:3000').replace(/\/+$/, ''),
    wahaApiKey: env.WAHA_API_KEY?.trim() || '',
    wahaDefaultSession: env.WAHA_DEFAULT_SESSION?.trim() || 'default',
    wahaWebhookHmacKey: env.WAHA_WEBHOOK_HMAC_KEY?.trim() || '',
    proxyBearerTokens,
    proxyExtraSecret: env.PROXY_EXTRA_SECRET?.trim() || '',
    enableQrPortal: parseBooleanEnv(env.ENABLE_QR_PORTAL, true),
    qrAdminLocalOnly: parseBooleanEnv(env.QR_ADMIN_LOCAL_ONLY, true),
    qrPublicBaseUrl: (env.QR_PUBLIC_BASE_URL?.trim() || '').replace(/\/+$/, ''),
    qrPortalToken: env.QR_PORTAL_TOKEN?.trim() || '',
    qrInviteSecret: env.QR_INVITE_SECRET?.trim() || env.QR_PORTAL_TOKEN?.trim() || '',
    qrInviteDefaultTtlSec: Math.max(60, parseIntEnv(env.QR_INVITE_DEFAULT_TTL_SEC, 900)),
    copasWebhookUrl: env.COPAS_WEBHOOK_URL?.trim() || '',
    copasApiStatusWebhookUrl: env.COPAS_API_STATUS_WEBHOOK_URL?.trim() || '',
    copasStatusWebhookSecret:
      env.COPAS_STATUS_WEBHOOK_SECRET?.trim() || env.META_APP_SECRET?.trim() || '',
    metaAppSecret: env.META_APP_SECRET?.trim() || '',
    metaWabaId: env.META_WABA_ID?.trim() || 'waha-proxy-waba',
    wahaCheckNumberExists: parseBooleanEnv(env.WAHA_CHECK_NUMBER_EXISTS, false),
    disconnectedSessionHttpStatus: disconnectedStatus >= 400 ? disconnectedStatus : 503,
    humanMinCooldownMs: parseIntEnv(env.HUMAN_MIN_COOLDOWN_MS, 4000),
    humanMaxCooldownMs: parseIntEnv(env.HUMAN_MAX_COOLDOWN_MS, 10000),
    humanTypingMsPerChar: parseIntEnv(env.HUMAN_TYPING_MS_PER_CHAR, 45),
    humanMinTypingMs: parseIntEnv(env.HUMAN_MIN_TYPING_MS, 1800),
    humanMaxTypingMs: parseIntEnv(env.HUMAN_MAX_TYPING_MS, 7000),
    maxSendRetries: Math.max(1, parseIntEnv(env.MAX_SEND_RETRIES, 3)),
  }
}

type CachedJson<T> = {
  mtimeMs: number
  value: T
}

const fileCache = new Map<string, CachedJson<unknown>>()

function readJsonFileCached<T>(filePath: string, fallback: T): T {
  if (!filePath || !existsSync(filePath)) return fallback
  try {
    const stat = statSync(filePath)
    const cached = fileCache.get(filePath)
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.value as T
    }
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as T
    fileCache.set(filePath, { mtimeMs: stat.mtimeMs, value: parsed })
    return parsed
  } catch {
    return fallback
  }
}

export function loadSessionsConfig(filePath: string): SessionsConfigFile {
  return readJsonFileCached<SessionsConfigFile>(filePath, {
    allowDefaultSessionFallback: true,
    sessions: {},
  })
}

export function loadTemplatesConfig(filePath: string): TemplatesConfigFile {
  return readJsonFileCached<TemplatesConfigFile>(filePath, {
    templates: {},
  })
}

export type ResolvedSession = SessionMappingEntry & {
  phoneNumberId: string
}

export function resolveSessionForPhoneNumberId(
  phoneNumberId: string,
  config: ProxyConfig,
  sessionsConfig: SessionsConfigFile,
): ResolvedSession | null {
  const direct = sessionsConfig.sessions?.[phoneNumberId]
  if (direct?.wahaSession) {
    return {
      phoneNumberId,
      wahaSession: direct.wahaSession,
      displayPhone: direct.displayPhone || phoneNumberId,
      bearerToken: direct.bearerToken,
      agencyName: direct.agencyName,
    }
  }

  if (sessionsConfig.allowDefaultSessionFallback !== false) {
    const fallbackEntry = sessionsConfig.sessions?.default
    return {
      phoneNumberId,
      wahaSession: fallbackEntry?.wahaSession || config.wahaDefaultSession || 'default',
      displayPhone: fallbackEntry?.displayPhone || phoneNumberId,
      bearerToken: fallbackEntry?.bearerToken,
      agencyName: fallbackEntry?.agencyName,
    }
  }

  return null
}

export function resolvePhoneMetadataByWahaSession(
  wahaSession: string,
  config: ProxyConfig,
  sessionsConfig: SessionsConfigFile,
): { phoneNumberId: string; displayPhone: string } {
  const entries = Object.entries(sessionsConfig.sessions || {})
  const specific = entries.find(
    ([key, entry]) => key !== 'default' && entry.wahaSession === wahaSession,
  )
  if (specific) {
    const [phoneNumberId, entry] = specific
    return {
      phoneNumberId,
      displayPhone: entry.displayPhone || phoneNumberId,
    }
  }

  const defaultEntry = sessionsConfig.sessions?.default
  if (defaultEntry && defaultEntry.wahaSession === wahaSession) {
    return {
      phoneNumberId: 'default',
      displayPhone: defaultEntry.displayPhone || config.wahaDefaultSession,
    }
  }

  return {
    phoneNumberId: wahaSession || config.wahaDefaultSession,
    displayPhone: wahaSession || config.wahaDefaultSession,
  }
}
