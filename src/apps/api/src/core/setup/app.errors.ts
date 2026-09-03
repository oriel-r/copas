import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getLogger } from '@copas/logger';
import type { AppEnv } from '../types/env';

export const registerErrorHandlers = (app: Hono<AppEnv>) => {
  const notFoundLogger = getLogger(['api', 'not-found']);
  const errorLogger = getLogger(['api', 'error']);

  app.notFound((c) => {
    notFoundLogger.warn('Endpoint not found: {method} {path}', {
      method: c.req.method,
      path: c.req.path,
    });
    return c.json({ success: false, error: 'Not Found' }, 404);
  });

  app.onError((err, c) => {
    const isHttp = err instanceof HTTPException;
    const status = isHttp ? err.status : 500;

    if (status >= 500) {
      errorLogger.error('Internal server error on {method} {path}: {error}', {
        method: c.req.method,
        path: c.req.path,
        status,
        error: err.message,
        stack: err.stack,
      });
    } else {
      errorLogger.warn('Client error on {method} {path}: {error}', {
        method: c.req.method,
        path: c.req.path,
        status,
        error: err.message,
      });
    }

    if (isHttp) {
      return err.getResponse();
    }

    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  });
};
