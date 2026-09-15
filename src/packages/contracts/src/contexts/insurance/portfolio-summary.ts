import { z } from 'zod';

export const companyDistributionItemSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  activePoliciesCount: z.number().int().nonnegative(),
  percentage: z.number().nonnegative().max(100),
});

export type CompanyDistributionItem = z.infer<typeof companyDistributionItemSchema>;

export const portfolioSummaryResponseSchema = z.object({
  activePoliciesCount: z.number().int().nonnegative(),
  totalInsuredsCount: z.number().int().nonnegative(),
  paidInstallmentsThisMonthCount: z.number().int().nonnegative(),
  totalInstallmentsThisMonthCount: z.number().int().nonnegative(),
  collectionRatePercentage: z.number().nonnegative().max(100),
  companiesDistribution: z.array(companyDistributionItemSchema),
});

export type PortfolioSummaryResponse = z.infer<typeof portfolioSummaryResponseSchema>;

// Alias for compatibility
export type DashboardStatsResponse = PortfolioSummaryResponse;
