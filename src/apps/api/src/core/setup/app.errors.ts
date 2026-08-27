import { Hono } from 'hono';
import type { AppEnv } from '../types/env';

export const registerErrorHandlers = (app: Hono<AppEnv>) => {
  app.notFound((c) => {
    return c.json({ success: false, error: 'Not Found' }, 404);
  });

  app.onError((err, c) => {
    console.error(err);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  });
};
