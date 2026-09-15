import { Hono } from 'hono';
import { portfolioSummaryResponseSchema } from '@copas/contracts/insurance';
import type { PortfolioService } from './portfolio.service';

const createPortfolioRouter = (deps?: { portfolioService?: PortfolioService } | PortfolioService | any) => {
  return new Hono<any>().get('/summary', async (c) => {
    const organizationId = c.get('organizationId' as any);
    if (!organizationId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const service = (deps && typeof deps === 'object' && 'portfolioService' in deps ? (deps as any).portfolioService : deps) 
      ?? c.get('services')?.portfolio 
      ?? c.get('portfolioModule')?.portfolioService 
      ?? c.get('portfolioService');

    if (!service || (typeof service === 'object' && Object.keys(service).length === 0) || (typeof service === 'object' && 'omitService' in service)) {
      return c.json({ error: 'PortfolioService not found' }, 500);
    }

    try {
      const s = service as any;
      const summary = await (s.getSummary ? s.getSummary(organizationId) : s.getPortfolioSummary(organizationId));
      const parsed = portfolioSummaryResponseSchema.parse(summary);
      return c.json(parsed, 200);
    } catch (err) {
      console.error(err);
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });
};

export const portfolioRouter = createPortfolioRouter();
export default portfolioRouter;
