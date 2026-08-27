import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { injectAppServices } from '../di';
import type { AppEnv } from '../types/env';

export const applyMiddlewares = (app: Hono<AppEnv>) => {
  app.use(
    '*',
    cors({
      origin: (origin, c) => {
        return origin === c.env?.CLIENT_URL ? origin : '';
      },
      credentials: true,
    }),
  );

  app.use('*', injectAppServices);
};
