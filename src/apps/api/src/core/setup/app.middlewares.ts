import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestLoggerMiddleware } from '@copas/logger';
import { sessionMiddleware } from '../middlewares/session';
import { injectAppServices } from '../di';
import type { AppEnv } from '../types/env';

export const applyMiddlewares = (app: Hono<AppEnv>) => {
  app.use('*', requestLoggerMiddleware({ appName: 'api', category: ['api', 'http'] }));
  app.use(
    '*',
    cors({
      origin: (origin, c) => {
        const clientUrl = c.env?.CLIENT_URL?.replace(/\/+$/, '');
        if (origin && origin === clientUrl) return origin;
        if (
          c.env?.NODE_ENV === 'development' &&
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return origin;
        }
        return '';
      },
      credentials: true,
    }),
  );

  app.use('*', sessionMiddleware);
  app.use('*', injectAppServices);
};
