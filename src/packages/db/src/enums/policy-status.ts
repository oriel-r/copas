export const policyStatus = [
  'active',
  'overdue',
  'expired',
  'renewed',
  'canceled',
] as const
export type PolicyStatus = (typeof policyStatus)[number]
