export const messageDirection = ['inbound', 'outbound'] as const
export type MessageDirection = (typeof messageDirection)[number]
