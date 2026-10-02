import type { Conversation } from '@copas/contracts'
import type { ConversationsRepository } from './conversations.repository'

export function createConversationsService(conversationsRepoOrDeps: any) {
  const deps = typeof conversationsRepoOrDeps === 'object' && conversationsRepoOrDeps !== null ? conversationsRepoOrDeps : {}
  const conversationsRepo: ConversationsRepository =
    deps.conversationsRepository ??
    deps.conversationsRepo ??
    deps.repository ??
    deps.repo ??
    conversationsRepoOrDeps

  return {
    getOrCreateActiveConversation: async (params: {
      organizationId: string
      organizationChannelEndpointId: string
      insuredId: string
      type?: string
      tx?: any
    }, txArg?: any): Promise<Conversation> => {
      const tx = params.tx ?? txArg
      const existing = tx !== undefined
        ? await (conversationsRepo as any).findOpenByInsuredAndEndpoint(
            params.insuredId,
            params.organizationChannelEndpointId,
            tx,
          )
        : await (conversationsRepo as any).findOpenByInsuredAndEndpoint(
            params.insuredId,
            params.organizationChannelEndpointId,
          )
      if (existing) return existing

      const createData = {
        organizationId: params.organizationId,
        organizationChannelEndpointId: params.organizationChannelEndpointId,
        insuredId: params.insuredId,
        type: params.type || 'reminder',
        status: 'open' as const,
      }

      return tx !== undefined
        ? await conversationsRepo.create(createData, tx)
        : await conversationsRepo.create(createData)
    },

    linkEntityToConversation: async (
      conversationId: string,
      entity: { policyId?: string; installmentId?: string; insuredId?: string },
      tx?: any,
    ): Promise<void> => {
      await conversationsRepo.linkEntity(conversationId, entity, tx)
    },
  }
}

export type ConversationsService = ReturnType<typeof createConversationsService>
