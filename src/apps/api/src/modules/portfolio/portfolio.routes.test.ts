import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import * as routesModule from './portfolio.routes'
import {
  portfolioSummaryResponseSchema,
  type PortfolioSummaryResponse,
} from '@copas/contracts'

describe('portfolio.routes - GET /portfolio/summary', () => {
  let mockPortfolioService: any
  let app: Hono

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

  const zeroStateResponse: PortfolioSummaryResponse = {
    activePoliciesCount: 0,
    totalInsuredsCount: 0,
    paidInstallmentsThisMonthCount: 0,
    totalInstallmentsThisMonthCount: 0,
    collectionRatePercentage: 0,
    companiesDistribution: [],
  }

  const fullCollectionResponse: PortfolioSummaryResponse = {
    activePoliciesCount: 100,
    totalInsuredsCount: 80,
    paidInstallmentsThisMonthCount: 50,
    totalInstallmentsThisMonthCount: 50,
    collectionRatePercentage: 100,
    companiesDistribution: [
      {
        companyId: 'comp-1',
        companyName: 'Federación Patronal',
        activePoliciesCount: 100,
        percentage: 100,
      },
    ],
  }

  const setupApp = (options: {
    orgId?: string | null
    service?: any
    omitService?: boolean
  } = {}) => {
    const testApp = new Hono()

    testApp.use('*', async (c, next) => {
      if (options.orgId !== undefined) {
        if (options.orgId !== null) {
          c.set('organizationId' as any, options.orgId)
        }
      } else {
        c.set('organizationId' as any, '018f9e2b-0000-7000-8000-000000000001')
      }

      if (!options.omitService) {
        const service = options.service ?? mockPortfolioService
        c.set('portfolioService' as any, service)
        c.set('services' as any, {
          portfolioService: service,
          portfolio: service,
          insurance: {
            portfolio: service,
            portfolioService: service,
          },
        })
      }
      await next()
    })

    const router =
      typeof (routesModule as any).createPortfolioRouter === 'function'
        ? (routesModule as any).createPortfolioRouter({
            portfolioService: options.service ?? mockPortfolioService,
          })
        : ((routesModule as any).portfolioRouter ??
           (routesModule as any).portfolioRoutes ??
           (routesModule as any).default)

    if (router) {
      testApp.route('/portfolio', router)
      testApp.route('/', router)
    }

    testApp.onError((err, c) => {
      return c.json({ error: err.message || 'Internal Server Error' }, 500)
    })

    return testApp
  }

  beforeEach(() => {
    mockPortfolioService = {
      getSummary: vi.fn().mockResolvedValue(validFullResponse),
      getPortfolioSummary: vi.fn().mockResolvedValue(validFullResponse),
      summary: vi.fn().mockResolvedValue(validFullResponse),
      getDashboardStats: vi.fn().mockResolvedValue(validFullResponse),
    }
    app = setupApp()
  })

  describe('Authentication & Authorization (401)', () => {
    it('should return 401 Unauthorized when organizationId is missing in session context', async () => {
      const unauthApp = setupApp({ orgId: null })

      const res = await unauthApp.request('/portfolio/summary')

      expect(res.status).toBe(401)
    })
  })

  describe('Standard Workflow (200 Happy Path)', () => {
    it('should return 200 with payload validated by portfolioSummaryResponseSchema', async () => {
      const res = await app.request('/portfolio/summary')

      expect(res.status).toBe(200)
      const data = await res.json()

      const validation = portfolioSummaryResponseSchema.safeParse(data)
      expect(validation.success).toBe(true)
      expect(data).toEqual(validFullResponse)
    })
  })

  describe('Boundary Value Cases', () => {
    it('should return 200 for zero state (0 policies, 0 insureds, 0% collection, empty companies distribution)', async () => {
      mockPortfolioService.getSummary.mockResolvedValue(zeroStateResponse)
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(zeroStateResponse)
      mockPortfolioService.summary.mockResolvedValue(zeroStateResponse)
      mockPortfolioService.getDashboardStats.mockResolvedValue(zeroStateResponse)

      const res = await app.request('/portfolio/summary')

      expect(res.status).toBe(200)
      const data = await res.json()

      const validation = portfolioSummaryResponseSchema.safeParse(data)
      expect(validation.success).toBe(true)
      expect(data.activePoliciesCount).toBe(0)
      expect(data.totalInsuredsCount).toBe(0)
      expect(data.collectionRatePercentage).toBe(0)
      expect(data.companiesDistribution).toEqual([])
    })

    it('should return 200 for 100% collection rate boundary case', async () => {
      mockPortfolioService.getSummary.mockResolvedValue(fullCollectionResponse)
      mockPortfolioService.getPortfolioSummary.mockResolvedValue(fullCollectionResponse)
      mockPortfolioService.summary.mockResolvedValue(fullCollectionResponse)
      mockPortfolioService.getDashboardStats.mockResolvedValue(fullCollectionResponse)

      const res = await app.request('/portfolio/summary')

      expect(res.status).toBe(200)
      const data = await res.json()

      const validation = portfolioSummaryResponseSchema.safeParse(data)
      expect(validation.success).toBe(true)
      expect(data.paidInstallmentsThisMonthCount).toBe(data.totalInstallmentsThisMonthCount)
      expect(data.collectionRatePercentage).toBe(100)
    })
  })

  describe('Unhandled Error Handling (500)', () => {
    it('should return 500 when the portfolio service throws an unhandled error', async () => {
      mockPortfolioService.getSummary.mockRejectedValue(new Error('Database connection failed'))
      mockPortfolioService.getPortfolioSummary.mockRejectedValue(new Error('Database connection failed'))
      mockPortfolioService.summary.mockRejectedValue(new Error('Database connection failed'))
      mockPortfolioService.getDashboardStats.mockRejectedValue(new Error('Database connection failed'))

      const res = await app.request('/portfolio/summary')

      expect(res.status).toBe(500)
    })

    it('should return 500 when portfolio service is missing in context', async () => {
      const brokenApp = setupApp({ omitService: true })

      const res = await brokenApp.request('/portfolio/summary')

      expect(res.status).toBe(500)
    })
  })
})
