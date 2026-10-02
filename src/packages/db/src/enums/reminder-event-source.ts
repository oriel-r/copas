export const reminderEventSource = [
  'installment_due',
  'policy_expiration',
] as const
export type ReminderEventSource = (typeof reminderEventSource)[number]
