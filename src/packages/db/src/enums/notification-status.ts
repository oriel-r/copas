export const notificationStatus = [
  'pending',
  'sent',
  'delivered',
  'read',
  'failed',
  'skipped',
] as const
export type NotificationStatus = (typeof notificationStatus)[number]
