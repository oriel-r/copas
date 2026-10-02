import { Hono } from 'hono';
import type { AppEnv } from '../types/env';
import { authRoutes } from '../../modules/auth/auth.routes';
import { policiesRouter } from '../../modules/insurance/policies/policies.routes';
import { installmentsRouter } from '../../modules/insurance/policy-installments/installments.routes';
import { reminderRulesRouter } from '../../modules/reminders/reminder-rules/reminder-rules.routes';
import { remindersRouter } from '../../modules/reminders/reminders.routes';
import { insuredsRouter } from '../../modules/insurance/insureds/insureds.routes';
import portfolioRouter from '../../modules/portfolio/portfolio.routes';

export const registerRoutes = (app: Hono<AppEnv>) => {
  return app
    .get('/', (c) => c.json({ service: 'api', status: 'ok' }))
    .route('/auth', authRoutes as any)
    .route('/policies', policiesRouter)
    .route('/installments', installmentsRouter)
    .route('/reminder-rules', reminderRulesRouter)
    .route('/reminders', remindersRouter)
    .route('/insureds', insuredsRouter)
    .route('/portfolio', portfolioRouter);
};


export type AppType = ReturnType<typeof registerRoutes>;
