export const billingFrequency = [
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'annual',
  'single_payment',
] as const
export type BillingFrequency = (typeof billingFrequency)[number]
