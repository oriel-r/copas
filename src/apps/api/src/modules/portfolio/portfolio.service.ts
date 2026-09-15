import type { PortfolioSummaryResponse } from '@copas/contracts/insurance';

export class PortfolioService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async getSummary(organizationId: string): Promise<PortfolioSummaryResponse> {
    const summaryRes = await this.db
      .prepare('SELECT activePoliciesCount, totalInsuredsCount, paidInstallmentsThisMonthCount, totalInstallmentsThisMonthCount FROM vPortfolioSummary WHERE organizationId = ?')
      .bind(organizationId)
      .first();

    const distributionRes = await this.db
      .prepare('SELECT companyId, companyName, activePoliciesCount FROM vPortfolioCompanies WHERE organizationId = ? ORDER BY activePoliciesCount DESC')
      .bind(organizationId)
      .all();

    const activePoliciesCount = summaryRes?.activePoliciesCount ?? 0;
    const totalInsuredsCount = summaryRes?.totalInsuredsCount ?? 0;
    const paidInstallmentsThisMonthCount = summaryRes?.paidInstallmentsThisMonthCount ?? 0;
    const totalInstallmentsThisMonthCount = summaryRes?.totalInstallmentsThisMonthCount ?? 0;

    let collectionRatePercentage = 0;
    if (totalInstallmentsThisMonthCount > 0) {
      collectionRatePercentage = Math.round((paidInstallmentsThisMonthCount / totalInstallmentsThisMonthCount) * 100);
    }

    const companiesDistribution = (distributionRes.results || []).map((row: any) => {
      let percentage = 0;
      if (activePoliciesCount > 0) {
        percentage = (row.activePoliciesCount / activePoliciesCount) * 100;
      }
      return {
        companyId: row.companyId,
        companyName: row.companyName,
        activePoliciesCount: row.activePoliciesCount,
        percentage
      };
    });

    return {
      activePoliciesCount,
      totalInsuredsCount,
      paidInstallmentsThisMonthCount,
      totalInstallmentsThisMonthCount,
      collectionRatePercentage,
      companiesDistribution
    };
  }
}
