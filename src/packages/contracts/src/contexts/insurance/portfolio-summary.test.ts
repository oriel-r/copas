import { describe, expect, it } from 'vitest'
import {
  companyDistributionItemSchema,
  portfolioSummaryResponseSchema,
  type CompanyDistributionItem,
  type PortfolioSummaryResponse,
} from './portfolio-summary'

describe('portfolio-summary contracts', () => {
  describe('companyDistributionItemSchema', () => {
    describe('Given valid company distribution items (Happy Path & Boundaries)', () => {
      it('should validate a standard company distribution item', () => {
        const item: CompanyDistributionItem = {
          companyId: 'comp-fed-pat',
          companyName: 'Federación Patronal',
          activePoliciesCount: 50,
          percentage: 50.0,
        }

        const parsed = companyDistributionItemSchema.safeParse(item)
        expect(parsed.success).toBe(true)
        if (parsed.success) {
          expect(parsed.data).toEqual(item)
        }
      })

      it('should accept boundary values: 0 active policies and 0% percentage', () => {
        const item = {
          companyId: 'comp-0',
          companyName: 'Nueva Compañía',
          activePoliciesCount: 0,
          percentage: 0,
        }

        const parsed = companyDistributionItemSchema.safeParse(item)
        expect(parsed.success).toBe(true)
      })

      it('should accept boundary value: 100% percentage', () => {
        const item = {
          companyId: 'comp-single',
          companyName: 'Única Compañía',
          activePoliciesCount: 120,
          percentage: 100,
        }

        const parsed = companyDistributionItemSchema.safeParse(item)
        expect(parsed.success).toBe(true)
      })

      it('should accept floating-point percentages', () => {
        const item = {
          companyId: 'comp-float',
          companyName: 'Sancor Seguros',
          activePoliciesCount: 33,
          percentage: 33.33,
        }

        const parsed = companyDistributionItemSchema.safeParse(item)
        expect(parsed.success).toBe(true)
      })
    })

    describe('Given invalid company distribution items (Edge Cases & Invariants)', () => {
      it('should reject negative activePoliciesCount', () => {
        const item = {
          companyId: 'comp-invalid',
          companyName: 'Invalid Comp',
          activePoliciesCount: -1,
          percentage: 10,
        }

        const parsed = companyDistributionItemSchema.safeParse(item)
        expect(parsed.success).toBe(false)
      })

      it('should reject non-integer activePoliciesCount', () => {
        const item = {
          companyId: 'comp-invalid',
          companyName: 'Invalid Comp',
          activePoliciesCount: 3.5,
          percentage: 10,
        }

        const parsed = companyDistributionItemSchema.safeParse(item)
        expect(parsed.success).toBe(false)
      })

      it('should reject negative percentage (< 0)', () => {
        const item = {
          companyId: 'comp-invalid',
          companyName: 'Invalid Comp',
          activePoliciesCount: 5,
          percentage: -0.1,
        }

        const parsed = companyDistributionItemSchema.safeParse(item)
        expect(parsed.success).toBe(false)
      })

      it('should reject percentage exceeding 100 (> 100)', () => {
        const item = {
          companyId: 'comp-invalid',
          companyName: 'Invalid Comp',
          activePoliciesCount: 5,
          percentage: 100.01,
        }

        const parsed = companyDistributionItemSchema.safeParse(item)
        expect(parsed.success).toBe(false)
      })

      it.each([
        ['companyId missing', { companyName: 'Name', activePoliciesCount: 1, percentage: 10 }],
        ['companyName missing', { companyId: 'id', activePoliciesCount: 1, percentage: 10 }],
        ['activePoliciesCount missing', { companyId: 'id', companyName: 'Name', percentage: 10 }],
        ['percentage missing', { companyId: 'id', companyName: 'Name', activePoliciesCount: 1 }],
      ])('should reject payload when %s', (_, invalidPayload) => {
        const parsed = companyDistributionItemSchema.safeParse(invalidPayload)
        expect(parsed.success).toBe(false)
      })

      it('should reject invalid types (e.g. number for companyId)', () => {
        const item = {
          companyId: 12345,
          companyName: 'Test',
          activePoliciesCount: 10,
          percentage: 20,
        }

        const parsed = companyDistributionItemSchema.safeParse(item)
        expect(parsed.success).toBe(false)
      })
    })
  })

  describe('portfolioSummaryResponseSchema', () => {
    const validFullResponse: PortfolioSummaryResponse = {
      activePoliciesCount: 142,
      totalInsuredsCount: 98,
      paidInstallmentsThisMonthCount: 35,
      totalInstallmentsThisMonthCount: 50,
      collectionRatePercentage: 70,
      companiesDistribution: [
        {
          companyId: 'comp-1',
          companyName: 'Federación Patronal',
          activePoliciesCount: 71,
          percentage: 50,
        },
        {
          companyId: 'comp-2',
          companyName: 'San Cristóbal',
          activePoliciesCount: 43,
          percentage: 30.28,
        },
        {
          companyId: 'comp-3',
          companyName: 'Sancor Seguros',
          activePoliciesCount: 28,
          percentage: 19.72,
        },
      ],
    }

    describe('Given valid portfolio summary responses (Happy Path & Boundaries)', () => {
      it('should validate a full portfolio summary response with multiple companies', () => {
        const parsed = portfolioSummaryResponseSchema.safeParse(validFullResponse)
        expect(parsed.success).toBe(true)
        if (parsed.success) {
          expect(parsed.data).toEqual(validFullResponse)
        }
      })

      it('should validate zero state response (no policies, 0% collection, empty companies)', () => {
        const zeroState: PortfolioSummaryResponse = {
          activePoliciesCount: 0,
          totalInsuredsCount: 0,
          paidInstallmentsThisMonthCount: 0,
          totalInstallmentsThisMonthCount: 0,
          collectionRatePercentage: 0,
          companiesDistribution: [],
        }

        const parsed = portfolioSummaryResponseSchema.safeParse(zeroState)
        expect(parsed.success).toBe(true)
      })

      it('should validate boundary collection rate: 100% and decimal collection rates', () => {
        const fullCollection: PortfolioSummaryResponse = {
          ...validFullResponse,
          paidInstallmentsThisMonthCount: 50,
          totalInstallmentsThisMonthCount: 50,
          collectionRatePercentage: 100,
        }

        const parsed = portfolioSummaryResponseSchema.safeParse(fullCollection)
        expect(parsed.success).toBe(true)

        const decimalRate: PortfolioSummaryResponse = {
          ...validFullResponse,
          collectionRatePercentage: 66.67,
        }
        const parsedDecimal = portfolioSummaryResponseSchema.safeParse(decimalRate)
        expect(parsedDecimal.success).toBe(true)
      })
    })

    describe('Given invalid portfolio summary payloads (Edge Cases & Boundaries)', () => {
      it.each([
        ['activePoliciesCount is negative', { ...validFullResponse, activePoliciesCount: -1 }],
        ['activePoliciesCount is float', { ...validFullResponse, activePoliciesCount: 1.5 }],
        ['totalInsuredsCount is negative', { ...validFullResponse, totalInsuredsCount: -5 }],
        ['totalInsuredsCount is float', { ...validFullResponse, totalInsuredsCount: 10.2 }],
        [
          'paidInstallmentsThisMonthCount is negative',
          { ...validFullResponse, paidInstallmentsThisMonthCount: -1 },
        ],
        [
          'paidInstallmentsThisMonthCount is float',
          { ...validFullResponse, paidInstallmentsThisMonthCount: 5.5 },
        ],
        [
          'totalInstallmentsThisMonthCount is negative',
          { ...validFullResponse, totalInstallmentsThisMonthCount: -2 },
        ],
        [
          'totalInstallmentsThisMonthCount is float',
          { ...validFullResponse, totalInstallmentsThisMonthCount: 8.9 },
        ],
      ])('should reject when %s', (_, payload) => {
        const parsed = portfolioSummaryResponseSchema.safeParse(payload)
        expect(parsed.success).toBe(false)
      })

      it('should reject collectionRatePercentage < 0', () => {
        const payload = {
          ...validFullResponse,
          collectionRatePercentage: -0.01,
        }
        const parsed = portfolioSummaryResponseSchema.safeParse(payload)
        expect(parsed.success).toBe(false)
      })

      it('should reject collectionRatePercentage > 100', () => {
        const payload = {
          ...validFullResponse,
          collectionRatePercentage: 100.01,
        }
        const parsed = portfolioSummaryResponseSchema.safeParse(payload)
        expect(parsed.success).toBe(false)
      })

      it('should reject when companiesDistribution is not an array', () => {
        const payload = {
          ...validFullResponse,
          companiesDistribution: 'not-an-array',
        }
        const parsed = portfolioSummaryResponseSchema.safeParse(payload)
        expect(parsed.success).toBe(false)
      })

      it('should reject when companiesDistribution contains an invalid item', () => {
        const payload = {
          ...validFullResponse,
          companiesDistribution: [
            {
              companyId: 'comp-1',
              companyName: 'Federación Patronal',
              activePoliciesCount: -1, // invalid
              percentage: 50,
            },
          ],
        }
        const parsed = portfolioSummaryResponseSchema.safeParse(payload)
        expect(parsed.success).toBe(false)
      })

      it.each([
        'activePoliciesCount',
        'totalInsuredsCount',
        'paidInstallmentsThisMonthCount',
        'totalInstallmentsThisMonthCount',
        'collectionRatePercentage',
        'companiesDistribution',
      ])('should reject when required field "%s" is missing', (field) => {
        const payload = { ...validFullResponse }
        delete (payload as any)[field]
        const parsed = portfolioSummaryResponseSchema.safeParse(payload)
        expect(parsed.success).toBe(false)
      })

      it('should reject null or undefined payload', () => {
        expect(portfolioSummaryResponseSchema.safeParse(null).success).toBe(false)
        expect(portfolioSummaryResponseSchema.safeParse(undefined).success).toBe(false)
      })
    })
  })
})
