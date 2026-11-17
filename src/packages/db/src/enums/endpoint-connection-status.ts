export const endpointConnectionStatus = [
  'connected',
  'waiting_qr',
  'disconnected',
  'error',
] as const
export type EndpointConnectionStatus = (typeof endpointConnectionStatus)[number]
