export const senderKind = ['user', 'insured', 'system', 'agent'] as const
export type SenderKind = (typeof senderKind)[number]
