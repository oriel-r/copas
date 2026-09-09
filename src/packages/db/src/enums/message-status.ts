export const messageStatus = [
  'sent',
  'delivered',
  'read',
  'failed',
  'received',
  'skipped',
] as const
export type MessageStatus = (typeof messageStatus)[number]
