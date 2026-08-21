export const ownerKind = ['platform', 'organization'] as const
export type OwnerKind = (typeof ownerKind)[number]
