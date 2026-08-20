export const provider = ['whatsapp_cloud', 'email_service'] as const
export type Provider = (typeof provider)[number]
