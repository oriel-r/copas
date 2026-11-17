import { AsyncLocalStorage } from 'node:async_hooks'
import {
  configureSync,
  getConsoleSink,
  getLogger,
  jsonLinesFormatter,
  withContext,
  type LogLevel,
  type Logger,
} from '@logtape/logtape'
import { prettyFormatter } from '@logtape/pretty'
import type { MiddlewareHandler } from 'hono'
import type { ProxyLogFormat } from '../config.ts'

export type SetupProxyLoggerOptions = {
  level?: LogLevel
  format?: ProxyLogFormat
  reset?: boolean
}

let isConfigured = false
let configuredLevel: LogLevel | undefined
let configuredFormat: ProxyLogFormat | undefined

export function setupProxyLogger(options: SetupProxyLoggerOptions = {}): void {
  const level = options.level ?? 'info'
  const format = options.format ?? 'pretty'

  if (
    isConfigured &&
    configuredLevel === level &&
    configuredFormat === format &&
    !options.reset
  ) {
    return
  }

  const sink =
    format === 'json'
      ? getConsoleSink({ formatter: jsonLinesFormatter })
      : getConsoleSink({ formatter: prettyFormatter })

  try {
    configureSync({
      reset: options.reset ?? isConfigured,
      contextLocalStorage: new AsyncLocalStorage(),
      sinks: {
        console: sink,
      },
      loggers: [
        {
          category: ['logtape', 'meta'],
          lowestLevel: 'warning',
          sinks: ['console'],
        },
        {
          category: [],
          lowestLevel: level,
          sinks: ['console'],
        },
      ],
    })
    isConfigured = true
    configuredLevel = level
    configuredFormat = format
  } catch (err: any) {
    if (err?.name === 'ConfigError' || err?.message?.includes('Already configured')) {
      isConfigured = true
      configuredLevel = level
      configuredFormat = format
      return
    }
    throw err
  }
}

export function getProxyLogger(category?: string | string[]): Logger {
  if (!category) return getLogger(['waha-proxy'])
  const parts = Array.isArray(category) ? category : [category]
  return getLogger(['waha-proxy', ...parts])
}

export function withProxyLogContext<T>(
  context: Record<string, unknown>,
  fn: () => T,
): T {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(context)) {
    if (v !== undefined) {
      clean[k] = v
    }
  }
  return withContext(clean, fn)
}

export function proxyRequestLoggerMiddleware(
  skipPaths: string[] = ['/health'],
): MiddlewareHandler {
  const skipSet = new Set(skipPaths)
  const logger = getProxyLogger('http')

  return async (c, next) => {
    if (skipSet.has(c.req.path)) {
      await next()
      return
    }

    const requestId =
      c.req.header('x-request-id') ||
      c.req.header('cf-ray') ||
      crypto.randomUUID()
    c.header('x-request-id', requestId)

    const method = c.req.method
    const path = c.req.path
    const clientIp =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    const start = performance.now()

    return withProxyLogContext({ requestId, method, path, clientIp }, async () => {
      logger.debug('HTTP request started: {method} {path}', {
        method,
        path,
        clientIp,
      })

      try {
        await next()
      } catch (err: any) {
        const durationMs = Math.round((performance.now() - start) * 100) / 100
        logger.error('HTTP request threw error: {method} {path} in {durationMs}ms - {error}', {
          method,
          path,
          durationMs,
          error: err?.message ?? String(err),
        })
        throw err
      }

      const durationMs = Math.round((performance.now() - start) * 100) / 100
      const status = c.res.status

      if (status >= 500) {
        logger.error('HTTP request failed: {method} {path} {status} in {durationMs}ms', {
          method,
          path,
          status,
          durationMs,
        })
      } else if (status >= 400) {
        logger.warn('HTTP request rejected: {method} {path} {status} in {durationMs}ms', {
          method,
          path,
          status,
          durationMs,
        })
      } else {
        logger.info('HTTP request completed: {method} {path} {status} in {durationMs}ms', {
          method,
          path,
          status,
          durationMs,
        })
      }
    })
  }
}
