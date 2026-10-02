import type { ConsentsRepository } from './consents.repository'

export function createConsentsService(consentsRepo: ConsentsRepository) {
  return {
    isInsuredOptedOut: async (insuredId: string, categoryCode: string): Promise<boolean> => {
      return await consentsRepo.isOptedOut(insuredId, categoryCode)
    },
  }
}

export type ConsentsService = ReturnType<typeof createConsentsService>
