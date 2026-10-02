export const subscriptionStatus = [
  'active',
  'past_due',
  'canceled',
  'expired',
] as const
export type SubscriptionStatus = (typeof subscriptionStatus)[number]
