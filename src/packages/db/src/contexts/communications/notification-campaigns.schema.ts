import { sql } from 'drizzle-orm'
import { check, index, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { enumCheck, fk, json, entity } from '../../shared'
import { campaignOrigin, campaignType } from '../../enums'
import { organization } from '@copas/auth'

export const notificationCampaigns = sqliteTable(
  'notification_campaigns',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    campaignOrigin: text('campaignOrigin').notNull().default('system'),
    name: text('name').notNull(),
    type: text('type').notNull(),
    metadata: json<Record<string, unknown>>('metadata'),
  },
  (table) => [
    index('notification_campaigns_organization_id_idx').on(table.organizationId),
    enumCheck(
      'notification_campaigns_campaign_origin_check',
      sql`${table.campaignOrigin}`,
      campaignOrigin,
    ),
    enumCheck('notification_campaigns_type_check', sql`${table.type}`, campaignType),
    check('notification_campaigns_metadata_json', sql`json_valid(${table.metadata})`),
  ],
)
