import { Hono } from 'hono';
import type { AppEnv } from '../types/env';
import { authRoutes } from '../../modules/auth/auth.routes';
import { policiesRouter } from '../../modules/insurance/policies/policies.routes';
import { reminderRulesRouter } from '../../modules/reminders/reminder-rules/reminder-rules.routes';
import { remindersRouter } from '../../modules/reminders/reminders.routes';

export const registerRoutes = (app: Hono<AppEnv>) => {
  return app
    .get('/', (c) => c.json({ service: 'api', status: 'ok' }))
    .route('/auth', authRoutes as any)
    .route('/policies', policiesRouter)
    .route('/reminder-rules', reminderRulesRouter)
    .route('/reminders', remindersRouter);
};


export type AppType = ReturnType<typeof registerRoutes>;
