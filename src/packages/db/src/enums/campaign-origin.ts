export const campaignOrigin = ['system', 'manual', 'scheduled'] as const
export type CampaignOrigin = (typeof campaignOrigin)[number]
