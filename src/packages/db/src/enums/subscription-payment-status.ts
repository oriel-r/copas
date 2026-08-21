export const subscriptionPaymentStatus = [
  'pending',
  'paid',
  'failed',
  'refunded',
] as const
export type SubscriptionPaymentStatus = (typeof subscriptionPaymentStatus)[number]
