export const conversationType = [
  'reminder',
  'renewal',
  'inquiry',
  'general',
] as const
export type ConversationType = (typeof conversationType)[number]
