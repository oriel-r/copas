export const billingInterval = ['month', 'quarter', 'year'] as const
export type BillingInterval = (typeof billingInterval)[number]
