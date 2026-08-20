export const campaignType = [
  'renewal_reminder',
  'installment_due',
  'payment_confirmation',
  'custom',
] as const
export type CampaignType = (typeof campaignType)[number]
