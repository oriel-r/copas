import type { D1Database, Queue } from '@cloudflare/workers-types'
import type { WhatsAppOutboundQueueMessage } from '@copas/contracts'

import { createConversationsRepository } from './conversations/conversations.repository'
import { createConversationsService } from './conversations/conversations.service'
import { createMessagesRepository } from './messages/messages.repository'
import { createMessagesService } from './messages/messages.service'
import { createChannelEndpointsRepository } from './channel-endpoints/channel-endpoints.repository'
import { createChannelEndpointsService, type ChannelEndpointsServiceOptions } from './channel-endpoints/channel-endpoints.service'
import { createConsentsRepository } from './consents/consents.repository'
import { createConsentsService } from './consents/consents.service'
import { createWhatsAppDispatchService } from './whatsapp/whatsapp-dispatch.service'

export interface CommunicationsModuleOptions extends ChannelEndpointsServiceOptions {}

export function createCommunicationsModule(
  db: D1Database,
  organizationId: string,
  whatsappQueue?: Queue<WhatsAppOutboundQueueMessage>,
  options: CommunicationsModuleOptions = {},
) {
  const conversationsRepo = createConversationsRepository(db, organizationId)
  const messagesRepo = createMessagesRepository(db, organizationId)
  const channelEndpointsRepo = createChannelEndpointsRepository(db, organizationId)
  const consentsRepo = createConsentsRepository(db, organizationId)

  const conversationsService = createConversationsService(conversationsRepo)
  const messagesService = createMessagesService(messagesRepo)
  const channelEndpointsService = createChannelEndpointsService(channelEndpointsRepo, options)
  const consentsService = createConsentsService(consentsRepo)
  const whatsappDispatchService = createWhatsAppDispatchService(whatsappQueue)

  return {
    conversations: conversationsService,
    messages: messagesService,
    channelEndpoints: channelEndpointsService,
    consents: consentsService,
    whatsappDispatch: whatsappDispatchService,
  }
}

export type CommunicationsModule = ReturnType<typeof createCommunicationsModule>
