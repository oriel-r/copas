import { Hono } from 'hono';
import { portfolioSummaryResponseSchema } from '@copas/contracts/insurance';
import { PortfolioService } from './portfolio.service';
import { getLogger } from '@copas/logger';

const createPortfolioRouter = (deps?: { portfolioService?: PortfolioService } | PortfolioService | any) => {
  const logger = getLogger(['api', 'portfolio']);

  return new Hono<any>().get('/summary', async (c) => {
    const requestId = c.get('requestId' as any);
    const organizationId = c.get('organizationId' as any);

    logger.info('Handling GET /portfolio/summary for organization {organizationId}', {
      organizationId,
      requestId,
    });

    if (!organizationId) {
      logger.warn('Unauthorized portfolio summary request: missing organizationId', { requestId });
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Resolve service from deps, DI container, or context
    const service = (deps && typeof deps === 'object' && 'portfolioService' in deps ? (deps as any).portfolioService : deps) 
      ?? c.get('services')?.portfolio 
      ?? c.get('portfolioModule')?.portfolioService 
      ?? c.get('portfolioService');

    if (!service || (typeof service === 'object' && Object.keys(service).length === 0) || (typeof service === 'object' && 'omitService' in service)) {
      logger.error('PortfolioService not found for organization {organizationId}', {
        organizationId,
        requestId,
      });
      return c.json({ error: 'PortfolioService not found' }, 500);
    }

    try {
      const s = service as any;
      const summary = await (s.getSummary ? s.getSummary(organizationId) : s.getPortfolioSummary(organizationId));
      const parsed = portfolioSummaryResponseSchema.parse(summary);

      logger.info('Successfully fetched portfolio summary for organization {organizationId}', {
        organizationId,
        requestId,
        activePoliciesCount: parsed.activePoliciesCount,
        totalInsuredsCount: parsed.totalInsuredsCount,
        collectionRatePercentage: parsed.collectionRatePercentage,
        companiesCount: parsed.companiesDistribution.length,
      });

      return c.json(parsed, 200);
    } catch (err: any) {
      logger.error('Failed to retrieve portfolio summary for organization {organizationId}: {error}', {
        organizationId,
        requestId,
        error: err?.message ?? String(err),
        stack: err?.stack,
      });
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });
};

export const portfolioRouter = createPortfolioRouter();
export default portfolioRouter;
