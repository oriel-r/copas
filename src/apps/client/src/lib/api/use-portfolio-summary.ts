import { useQuery } from '@tanstack/react-query';
import type { PortfolioSummaryResponse } from '@copas/contracts/insurance';
import { portfolioSummaryResponseSchema } from '@copas/contracts/insurance';
import { apiClient } from '../api-client';
import { isDemoMode } from '../session';

export const portfolioKeys = {
  all: ['portfolio-summary'] as const,
  summary: () => [...portfolioKeys.all, 'summary'] as const,
};

const MOCK_PORTFOLIO_SUMMARY: PortfolioSummaryResponse = {
  activePoliciesCount: 42,
  totalInsuredsCount: 28,
  paidInstallmentsThisMonthCount: 35,
  totalInstallmentsThisMonthCount: 42,
  collectionRatePercentage: 83,
  companiesDistribution: [
    { companyId: '1', companyName: 'Sancor Seguros', activePoliciesCount: 20, percentage: 47.6 },
    { companyId: '2', companyName: 'Federación Patronal', activePoliciesCount: 15, percentage: 35.7 },
    { companyId: '3', companyName: 'La Segunda', activePoliciesCount: 7, percentage: 16.7 },
  ],
};

export function usePortfolioSummary() {
  return useQuery<PortfolioSummaryResponse>({
    queryKey: ['portfolio-summary'],
    retry: false,
    queryFn: async () => {
      if (isDemoMode()) {
        return portfolioSummaryResponseSchema.parse(MOCK_PORTFOLIO_SUMMARY);
      }
      
      const response = await apiClient.portfolio.summary.$get();
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio summary');
      }
      const data = await response.json();
      return portfolioSummaryResponseSchema.parse(data);
    },
  });
}
