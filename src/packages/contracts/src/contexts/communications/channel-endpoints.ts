import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-orm/zod'
import { z } from 'zod'

import { channelEndpoints } from '@copas/db'

import { optionalIdSchema, phoneSchema, uuidV7Schema } from '../../shared'

export const channelEndpointsInsertSchema = createInsertSchema(channelEndpoints, {
  id: optionalIdSchema,
})

export const channelEndpointsSelectSchema = createSelectSchema(channelEndpoints, {
  id: () => uuidV7Schema,
})

export const channelEndpointsUpdateSchema = createUpdateSchema(channelEndpoints, {
  id: () => uuidV7Schema,
})

const serverControlled = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const

export const createChannelEndpointRequestSchema = channelEndpointsInsertSchema.omit(serverControlled)
export const updateChannelEndpointRequestSchema = channelEndpointsUpdateSchema.omit(serverControlled)
export const channelEndpointResponseSchema = channelEndpointsSelectSchema

export type ChannelEndpoint = z.infer<typeof channelEndpointsSelectSchema>
export type ChannelEndpointInsert = z.infer<typeof channelEndpointsInsertSchema>
export type ChannelEndpointUpdate = z.infer<typeof channelEndpointsUpdateSchema>
export type CreateChannelEndpointRequest = z.infer<typeof createChannelEndpointRequestSchema>
export type UpdateChannelEndpointRequest = z.infer<typeof updateChannelEndpointRequestSchema>
export type ChannelEndpointResponse = z.infer<typeof channelEndpointResponseSchema>

export const upsertOrganizationWhatsAppEndpointRequestSchema = z.object({
  number: z
    .string()
    .trim()
    .pipe(phoneSchema)
    .refine(
      (val) => {
        if (val.startsWith('+54 9')) {
          return val.slice('+54 9'.length).replace(/\D/g, '').length >= 6
        }
        return true
      },
      { message: 'Ingresá el código de área y el número completo' },
    ),
})

export const organizationWhatsAppEndpointSchema = z.object({
  endpointId: z.string(),
  organizationChannelEndpointId: z.string().nullable(),
  organizationId: z.string(),
  number: z.string().nullable(),
  provider: z.literal('whatsapp_cloud'),
  ownerKind: z.literal('organization'),
  status: z.enum(['active', 'inactive', 'released']),
  linkingStatus: z.enum(['active', 'suspended', 'released']),
})

export const getOrganizationWhatsAppEndpointResponseSchema = z.object({
  endpoint: organizationWhatsAppEndpointSchema.nullable(),
})

export type UpsertOrganizationWhatsAppEndpointRequest = z.infer<
  typeof upsertOrganizationWhatsAppEndpointRequestSchema
>
export type OrganizationWhatsAppEndpoint = z.infer<typeof organizationWhatsAppEndpointSchema>
export type GetOrganizationWhatsAppEndpointResponse = z.infer<
  typeof getOrganizationWhatsAppEndpointResponseSchema
>