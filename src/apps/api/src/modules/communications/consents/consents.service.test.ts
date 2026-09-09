import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createConsentsService } from './consents.service'

describe('consents.service', () => {
  let mockConsentsRepository: any
  let service: ReturnType<typeof createConsentsService>

  beforeEach(() => {
    mockConsentsRepository = {
      isOptedOut: vi.fn(),
    }
    service = createConsentsService(mockConsentsRepository as any)
  })

  describe('isInsuredOptedOut', () => {
    it('should return true when repository indicates insured has opted out', async () => {
      mockConsentsRepository.isOptedOut.mockResolvedValueOnce(true)

      const result = await service.isInsuredOptedOut('ins-123', 'payment_reminder')

      expect(result).toBe(true)
      expect(mockConsentsRepository.isOptedOut).toHaveBeenCalledWith('ins-123', 'payment_reminder')
    })

    it('should return false when repository indicates insured is not opted out', async () => {
      mockConsentsRepository.isOptedOut.mockResolvedValueOnce(false)

      const result = await service.isInsuredOptedOut('ins-456', 'policy_expiration')

      expect(result).toBe(false)
      expect(mockConsentsRepository.isOptedOut).toHaveBeenCalledWith('ins-456', 'policy_expiration')
    })

    it('should correctly propagate errors if repository throws', async () => {
      mockConsentsRepository.isOptedOut.mockRejectedValueOnce(new Error('Database query error'))

      await expect(
        service.isInsuredOptedOut('ins-err', 'payment_reminder'),
      ).rejects.toThrow('Database query error')
    })
  })
})

