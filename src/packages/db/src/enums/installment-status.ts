export const installmentStatus = ['pending', 'paid', 'overdue'] as const
export type InstallmentStatus = (typeof installmentStatus)[number]
