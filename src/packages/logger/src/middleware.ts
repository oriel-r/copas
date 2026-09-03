import type { MiddlewareHandler } from 'hono';
import { getLogger } from '@logtape/logtape';
import { withLogContext } from './context.js';
import { ensureLogger } from './config.js';

export interface RequestLoggerOptions {
  appName?: string;
  category?: string[];
  skipPaths?: string[];
}

export function requestLoggerMiddleware(options: RequestLoggerOptions = {}): MiddlewareHandler {
  const category = options.category ?? ['api', 'http'];
  const appName = options.appName ?? 'api';
  const skipPaths = new Set(options.skipPaths ?? ['/health', '/favicon.ico']);

  return async (c, next) => {
    if (skipPaths.has(c.req.path)) {
      await next();
      return;
    }

    ensureLogger({
      appName,
      environment: (c.env as any)?.NODE_ENV,
    });

    // Extract request ID: x-request-id -> cf-ray -> crypto.randomUUID()
    const incomingReqId = c.req.header('x-request-id') || c.req.header('cf-ray');
    const requestId =
      incomingReqId ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

    // Propagate request ID in response header and context variable
    c.header('x-request-id', requestId);
    c.set('requestId' as any, requestId);

    const logger = getLogger(category);
    const start = performance.now();
    const method = c.req.method;
    const path = c.req.path;
    const clientIp =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    return await withLogContext(
      {
        requestId,
        method,
        path,
        clientIp,
        userAgent,
      },
      async () => {
        logger.debug('HTTP request started: {method} {path}', {
          method,
          path,
          clientIp,
          userAgent,
        });

        try {
          await next();
        } catch (err: any) {
          const durationMs = Math.round((performance.now() - start) * 100) / 100;
          logger.error('HTTP request failed: {method} {path} - {error}', {
            method,
            path,
            durationMs,
            error: err?.message ?? String(err),
            stack: err?.stack,
          });
          throw err;
        }

        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        const status = c.res.status;

        if (status >= 500) {
          logger.error('HTTP request error: {method} {path} {status} in {durationMs}ms', {
            method,
            path,
            status,
            durationMs,
          });
        } else if (status >= 400) {
          logger.warn('HTTP request warning: {method} {path} {status} in {durationMs}ms', {
            method,
            path,
            status,
            durationMs,
          });
        } else {
          logger.info('HTTP request completed: {method} {path} {status} in {durationMs}ms', {
            method,
            path,
            status,
            durationMs,
          });
        }
      }
    );
  };
}
