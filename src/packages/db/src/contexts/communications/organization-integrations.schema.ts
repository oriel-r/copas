import { sql } from 'drizzle-orm'
import { check, index, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { enumCheck, fk, json, entity } from '../../shared'
import { integrationStatus, provider } from '../../enums'
import { organization } from '@copas/auth'

export const organizationIntegrations = sqliteTable(
  'organization_integrations',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    provider: text('provider').notNull(),
    status: text('status').notNull().default('active'),
    credentials: json<Record<string, unknown>>('credentials'),
    config: json<Record<string, unknown>>('config'),
  },
  (table) => [
    index('organization_integrations_organization_id_idx').on(table.organizationId),
    enumCheck('organization_integrations_provider_check', sql`${table.provider}`, provider),
    enumCheck('organization_integrations_status_check', sql`${table.status}`, integrationStatus),
    check('organization_integrations_credentials_json', sql`json_valid(${table.credentials})`),
    check('organization_integrations_config_json', sql`json_valid(${table.config})`),
  ],
)
