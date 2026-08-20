import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { entity, fk, json } from '../../shared'
import { organization } from '@copas/auth'
import { channels } from './channels.schema'
import { organizationIntegrations } from './organization-integrations.schema'

export const organizationChannels = sqliteTable(
  'organization_channels',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    channelId: fk('channelId', true).references(
      () => channels.id,
      { onDelete: 'cascade' },
    ),
    integrationId: fk('integrationId').references(
      () => organizationIntegrations.id,
    ),
    isEnabled: integer('isEnabled', { mode: 'boolean' }).notNull().default(false),
    config: json<Record<string, unknown>>('config'),
  },
  (table) => [
    uniqueIndex('organization_channels_org_channel_uq').on(
      table.organizationId,
      table.channelId,
    ),
    index('organization_channels_integration_id_idx').on(table.integrationId),
    check('organization_channels_config_json', sql`json_valid(${table.config})`),
  ],
)
