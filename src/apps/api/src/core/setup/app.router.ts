import { Hono } from 'hono';
import type { AppEnv } from '../types/env';
import { authRoutes } from '../../modules/auth/auth.routes';
import { policiesRouter } from '../../modules/insurance/policies/policies.routes';

export const registerRoutes = (app: Hono<AppEnv>) => {
  return app
    .get('/', (c) => c.json({ service: 'api', status: 'ok' }))
    .route('/auth', authRoutes as any)
    .route('/policies', policiesRouter);
};
