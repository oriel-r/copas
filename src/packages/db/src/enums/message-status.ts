export const messageStatus = [
  'sent',
  'delivered',
  'read',
  'failed',
  'received',
] as const
export type MessageStatus = (typeof messageStatus)[number]
