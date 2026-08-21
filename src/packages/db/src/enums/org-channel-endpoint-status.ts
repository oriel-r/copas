export const orgChannelEndpointStatus = [
  'active',
  'suspended',
  'released',
] as const
export type OrgChannelEndpointStatus = (typeof orgChannelEndpointStatus)[number]
