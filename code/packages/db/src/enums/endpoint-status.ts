export const endpointStatus = ['active', 'inactive', 'released'] as const
export type EndpointStatus = (typeof endpointStatus)[number]
