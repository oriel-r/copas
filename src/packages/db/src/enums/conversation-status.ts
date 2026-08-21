export const conversationStatus = ['open', 'pending', 'closed'] as const
export type ConversationStatus = (typeof conversationStatus)[number]
