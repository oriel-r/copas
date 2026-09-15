import type { PortfolioSummaryResponse } from '@copas/contracts/insurance';
import { getLogger } from '@copas/logger';

export class PortfolioService {
  private db: any;
  private logger = getLogger(['api', 'portfolio', 'service']);

  constructor(db: any) {
    this.db = db;
  }

  async getSummary(organizationId: string): Promise<PortfolioSummaryResponse> {
    this.logger.debug('Starting getSummary for organization {organizationId}', { organizationId });

    if (!this.db || typeof this.db.prepare !== 'function') {
      this.logger.error('Database connection not available in PortfolioService for organization {organizationId}', { organizationId });
      throw new Error('Database client not available in PortfolioService');
    }

    try {
      // Query summary counts directly from base tables (guaranteed in migrations)
      // with fallback to view if needed
      let summaryRes: any;
      try {
        summaryRes = await this.db
          .prepare(`
            SELECT 
              (SELECT COUNT(*) FROM policies WHERE organizationId = ? AND status = 'active' AND deleted_at IS NULL) AS activePoliciesCount,
              (SELECT COUNT(*) FROM insureds WHERE organizationId = ? AND deleted_at IS NULL) AS totalInsuredsCount,
              (SELECT COUNT(*) FROM policy_installments WHERE organizationId = ? AND status = 'paid' AND substr(dueDate, 1, 7) = strftime('%Y-%m', 'now') AND deleted_at IS NULL) AS paidInstallmentsThisMonthCount,
              (SELECT COUNT(*) FROM policy_installments WHERE organizationId = ? AND substr(dueDate, 1, 7) = strftime('%Y-%m', 'now') AND deleted_at IS NULL) AS totalInstallmentsThisMonthCount
          `)
          .bind(organizationId, organizationId, organizationId, organizationId)
          .first();
      } catch (err) {
        this.logger.warn('Direct base table count query failed, attempting view fallback: {error}', {
          organizationId,
          error: (err as any)?.message ?? String(err),
        });
        summaryRes = await this.db
          .prepare('SELECT activePoliciesCount, totalInsuredsCount, paidInstallmentsThisMonthCount, totalInstallmentsThisMonthCount FROM vPortfolioSummary WHERE organizationId = ?')
          .bind(organizationId)
          .first();
      }

      let distributionRes: any;
      try {
        distributionRes = await this.db
          .prepare(`
            SELECT 
              p.companyId AS companyId,
              c.name AS companyName,
              COUNT(*) AS activePoliciesCount
            FROM policies p
            JOIN companies c ON c.id = p.companyId
            WHERE p.organizationId = ? 
              AND p.status = 'active' 
              AND p.deleted_at IS NULL 
              AND c.deleted_at IS NULL
            GROUP BY p.companyId, c.name
            ORDER BY activePoliciesCount DESC
          `)
          .bind(organizationId)
          .all();
      } catch (err) {
        this.logger.warn('Direct company distribution query failed, attempting view fallback: {error}', {
          organizationId,
          error: (err as any)?.message ?? String(err),
        });
        distributionRes = await this.db
          .prepare('SELECT companyId, companyName, activePoliciesCount FROM vPortfolioCompanies WHERE organizationId = ? ORDER BY activePoliciesCount DESC')
          .bind(organizationId)
          .all();
      }

      const activePoliciesCount = Number(summaryRes?.activePoliciesCount ?? summaryRes?.active_policies_count ?? 0);
      const totalInsuredsCount = Number(summaryRes?.totalInsuredsCount ?? summaryRes?.total_insureds_count ?? 0);
      const paidInstallmentsThisMonthCount = Number(summaryRes?.paidInstallmentsThisMonthCount ?? summaryRes?.paid_installments_this_month_count ?? 0);
      const totalInstallmentsThisMonthCount = Number(summaryRes?.totalInstallmentsThisMonthCount ?? summaryRes?.total_installments_this_month_count ?? 0);

      let collectionRatePercentage = 0;
      if (totalInstallmentsThisMonthCount > 0) {
        collectionRatePercentage = Math.round((paidInstallmentsThisMonthCount / totalInstallmentsThisMonthCount) * 100);
      }
      collectionRatePercentage = Math.min(100, Math.max(0, collectionRatePercentage));

      const rawResults = Array.isArray(distributionRes?.results) 
        ? distributionRes.results 
        : (Array.isArray(distributionRes) ? distributionRes : []);

      const companiesDistribution = rawResults.map((row: any) => {
        const count = Number(row.activePoliciesCount ?? row.active_policies_count ?? 0);
        let percentage = 0;
        if (activePoliciesCount > 0) {
          percentage = Math.round((count / activePoliciesCount) * 1000) / 10;
          percentage = Math.min(100, Math.max(0, percentage));
        }
        return {
          companyId: String(row.companyId ?? row.company_id ?? ''),
          companyName: String(row.companyName ?? row.company_name ?? 'Desconocida'),
          activePoliciesCount: count,
          percentage,
        };
      });

      const response: PortfolioSummaryResponse = {
        activePoliciesCount,
        totalInsuredsCount,
        paidInstallmentsThisMonthCount,
        totalInstallmentsThisMonthCount,
        collectionRatePercentage,
        companiesDistribution,
      };

      this.logger.debug('Successfully computed portfolio summary for {organizationId}: {summary}', {
        organizationId,
        activePoliciesCount,
        totalInsuredsCount,
        collectionRatePercentage,
        companiesCount: companiesDistribution.length,
      });

      return response;
    } catch (err: any) {
      this.logger.error('Error executing portfolio queries in PortfolioService for {organizationId}: {error}', {
        organizationId,
        error: err?.message ?? String(err),
        stack: err?.stack,
      });
      throw err;
    }
  }

  async getPortfolioSummary(organizationId: string): Promise<PortfolioSummaryResponse> {
    return this.getSummary(organizationId);
  }
}
