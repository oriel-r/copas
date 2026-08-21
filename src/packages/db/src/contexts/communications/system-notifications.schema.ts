import { sql } from 'drizzle-orm'
import {
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

import { enumCheck, fk, entity } from '../../shared'
import { notificationStatus } from '../../enums'
import { user, organization } from '@copas/auth'
import { channels } from './channels.schema'
import { messageTemplates } from './message-templates.schema'
import { notificationCampaigns } from './notification-campaigns.schema'

export const systemNotifications = sqliteTable(
  'system_notifications',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    channelId: fk('channelId', true).references(
      () => channels.id,
      { onDelete: 'restrict' },
    ),
    templateId: fk('templateId', true),
    campaignId: fk('campaignId').references(() => notificationCampaigns.id),
    recipientUserId: fk('recipientUserId').references(() => user.id),
    recipientAddress: text('recipientAddress'),
    content: text('content'),
    status: text('status').notNull().default('pending'),
    sentAt: integer('sentAt', { mode: 'timestamp_ms' }),
  },
  (table) => [
    foreignKey({
      columns: [table.templateId, table.channelId],
      foreignColumns: [messageTemplates.id, messageTemplates.channelId],
    }),
    index('system_notifications_org_status_idx').on(
      table.organizationId,
      table.status,
    ),
    index('system_notifications_template_channel_idx').on(
      table.templateId,
      table.channelId,
    ),
    index('system_notifications_campaign_id_idx').on(table.campaignId),
    index('system_notifications_recipient_user_id_idx').on(table.recipientUserId),
    enumCheck(
      'system_notifications_status_check',
      sql`${table.status}`,
      notificationStatus,
    ),
  ],
)
