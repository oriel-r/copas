import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import {
  currency,
  dateCivil,
  entity,
  enumCheck,
  fk,
  money,
  uploadedBy,
} from '../../shared'
import { installmentStatus } from '../../enums'
import { organization, user } from '@copas/auth'
import { policies } from './policies.schema'

export const policyInstallments = sqliteTable(
  'policy_installments',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    policyId: fk('policyId', true).references(() => policies.id, {
      onDelete: 'cascade',
    }),
    uploadedBy: uploadedBy().references(() => user.id, {
      onDelete: 'restrict',
    }),
    installmentNumber: integer('installmentNumber').notNull(),
    dueDate: dateCivil('dueDate'),
    totalAmount: money('totalAmount'),
    currency: currency(),
    status: text('status').notNull().default('pending'),
    receiptUrl: text('receiptUrl'),
  },
  (table) => [
    index('policy_installments_policy_id_idx').on(table.policyId),
    index('policy_installments_status_idx').on(table.status),
    index('policy_installments_due_date_idx').on(table.dueDate),
    index('policy_installments_organization_id_idx').on(table.organizationId),
    index('policy_installments_uploaded_by_idx').on(table.uploadedBy),
    enumCheck(
      'policy_installments_status_check',
      sql`${table.status}`,
      installmentStatus,
    ),
  ],
)
