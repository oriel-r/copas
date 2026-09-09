import type { Message } from '@copas/contracts'
import type { MessagesRepository } from './messages.repository'

export function createMessagesService(messagesRepoOrDeps: any, _orgIdArg?: string) {
  const isDeps = typeof messagesRepoOrDeps === 'object' && messagesRepoOrDeps !== null
  const messagesRepo: MessagesRepository = (
    isDeps && 'messagesRepo' in messagesRepoOrDeps ? messagesRepoOrDeps.messagesRepo :
    isDeps && 'messagesRepository' in messagesRepoOrDeps ? messagesRepoOrDeps.messagesRepository :
    isDeps && 'repo' in messagesRepoOrDeps ? messagesRepoOrDeps.repo :
    messagesRepoOrDeps
  )

  return {
    recordOutboundMessage: async (params: {
      organizationId: string
      conversationId: string
      templateId?: string | null
      content: string
      deduplicationHash?: string | null
      metadata?: Record<string, unknown>
      status?: 'sent' | 'skipped'
      skipReason?: string
      tx?: any
    }, txArg?: any): Promise<Message> => {
      const tx = params.tx ?? txArg
      const message = tx !== undefined 
        ? await messagesRepo.create({
            organizationId: params.organizationId,
            conversationId: params.conversationId,
            direction: 'outbound',
            status: params.status || 'sent',
            content: { text: params.content, templateId: params.templateId },
            deduplicationHash: params.deduplicationHash,
          }, tx)
        : await messagesRepo.create({
            organizationId: params.organizationId,
            conversationId: params.conversationId,
            direction: 'outbound',
            status: params.status || 'sent',
            content: { text: params.content, templateId: params.templateId },
            deduplicationHash: params.deduplicationHash,
          })

      const statusDetails = params.skipReason ? { reason: params.skipReason, ...params.metadata } : params.metadata
      if (tx !== undefined) {
        await messagesRepo.createStatus(message.id, params.status || 'sent', statusDetails, tx)
      } else {
        await messagesRepo.createStatus(message.id, params.status || 'sent', statusDetails)
      }
      return message
    },

    isAlreadySent: async (deduplicationHash: string, tx?: any): Promise<boolean> => {
      const existing = tx !== undefined 
        ? await messagesRepo.findByDeduplicationHash(deduplicationHash, tx)
        : await messagesRepo.findByDeduplicationHash(deduplicationHash)
      return existing !== null
    },
  }
}

export type MessagesService = ReturnType<typeof createMessagesService>
