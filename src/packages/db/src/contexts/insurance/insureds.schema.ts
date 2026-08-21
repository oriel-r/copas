import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { dateCivil, entity, fk, uploadedBy } from '../../shared'
import { organization, user } from '@copas/auth'

export const insureds = sqliteTable(
  'insureds',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    uploadedBy: uploadedBy().references(() => user.id, {
      onDelete: 'restrict',
    }),
    cuit: text('cuit').notNull(),
    fullName: text('fullName').notNull(),
    phone: text('phone'),
    email: text('email'),
    birthDate: dateCivil('birthDate'),
  },
  (table) => [
    uniqueIndex('insureds_organization_cuit_uq').on(
      table.organizationId,
      table.cuit,
    ),
    index('insureds_organization_id_idx').on(table.organizationId),
    index('insureds_uploaded_by_idx').on(table.uploadedBy),
  ],
)
