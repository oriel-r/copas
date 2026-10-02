import { sql } from 'drizzle-orm'
import { check, index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { enumCheck, fk, json, entity } from '../../shared'
import { conversationStatus, conversationType } from '../../enums'
import { organization } from '@copas/auth'
import { insureds } from '../insurance'
import { notificationCampaigns } from './notification-campaigns.schema'
import { organizationChannelEndpoints } from './organization-channel-endpoints.schema'

export const conversations = sqliteTable(
  'conversations',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    organizationChannelEndpointId: fk(
      'organizationChannelEndpointId',
    ).references(() => organizationChannelEndpoints.id),
    insuredId: fk('insuredId').references(() => insureds.id, {
      onDelete: 'set null',
    }),
    campaignId: fk('campaignId').references(() => notificationCampaigns.id),
    type: text('type').notNull(),
    subject: text('subject'),
    status: text('status').notNull().default('open'),
    metadata: json<Record<string, unknown>>('metadata'),
  },
  (table) => [
    uniqueIndex('conversations_id_org_uq').on(table.id, table.organizationId),
    index('conversations_organization_id_idx').on(table.organizationId),
    index('conversations_insured_id_idx').on(table.insuredId),
    index('conversations_campaign_id_idx').on(table.campaignId),
    index('conversations_org_channel_endpoint_id_idx').on(
      table.organizationChannelEndpointId,
    ),
    enumCheck('conversations_type_check', sql`${table.type}`, conversationType),
    enumCheck('conversations_status_check', sql`${table.status}`, conversationStatus),
    check('conversations_metadata_json', sql`json_valid(${table.metadata})`),
  ],
)
