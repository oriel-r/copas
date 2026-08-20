export const integrationStatus = [
  'active',
  'pending',
  'error',
  'disabled',
] as const
export type IntegrationStatus = (typeof integrationStatus)[number]
