import { sql } from 'drizzle-orm'
import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import {
  currency,
  dateCivil,
  entity,
  enumCheck,
  fk,
  money,
  uploadedBy,
} from '../../shared'
import { billingFrequency, policyStatus } from '../../enums'
import { organization, user } from '@copas/auth'
import { companies } from './companies.schema'
import { insureds } from './insureds.schema'
import { paymentMethods } from './payment-methods.schema'

export const policies = sqliteTable(
  'policies',
  {
    ...entity,
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    companyId: fk('companyId', true).references(() => companies.id, {
      onDelete: 'restrict',
    }),
    insuredId: fk('insuredId', true).references(() => insureds.id, {
      onDelete: 'restrict',
    }),
    paymentMethodId: fk('paymentMethodId').references(
      () => paymentMethods.id,
      { onDelete: 'set null' },
    ),
    uploadedBy: uploadedBy().references(() => user.id, {
      onDelete: 'restrict',
    }),
    producedBy: fk('producedBy').references(() => user.id, {
      onDelete: 'set null',
    }),
    policyNumber: text('policyNumber').notNull(),
    premiumTotal: money('premiumTotal'),
    currency: currency(),
    startDate: dateCivil('startDate'),
    endDate: dateCivil('endDate'),
    effectiveEndDate: dateCivil('effectiveEndDate'),
    status: text('status').notNull().default('active'),
    billingFrequency: text('billingFrequency').notNull().default('monthly'),
    documentUrl: text('documentUrl'),
  },
  (table) => [
    uniqueIndex('policies_org_company_number_uq').on(
      table.organizationId,
      table.companyId,
      table.policyNumber,
    ),
    index('policies_insured_id_idx').on(table.insuredId),
    index('policies_company_id_idx').on(table.companyId),
    index('policies_payment_method_id_idx').on(table.paymentMethodId),
    index('policies_uploaded_by_idx').on(table.uploadedBy),
    index('policies_produced_by_idx').on(table.producedBy),
    enumCheck('policies_status_check', sql`${table.status}`, policyStatus),
    enumCheck(
      'policies_billing_frequency_check',
      sql`${table.billingFrequency}`,
      billingFrequency,
    ),
  ],
)
