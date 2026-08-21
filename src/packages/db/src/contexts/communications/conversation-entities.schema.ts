import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable } from 'drizzle-orm/sqlite-core'

import { eventLogTable, fk } from '../../shared'
import { user } from '@copas/auth'
import { insureds, policies, policyInstallments } from '../insurance'
import { conversations } from './conversations.schema'

export const conversationEntities = sqliteTable(
  'conversation_entities',
  {
    ...eventLogTable,
    conversationId: fk('conversationId', true).references(
      () => conversations.id,
      { onDelete: 'cascade' },
    ),
    policyId: fk('policyId').references(() => policies.id, {
      onDelete: 'set null',
    }),
    insuredId: fk('insuredId').references(() => insureds.id, {
      onDelete: 'set null',
    }),
    installmentId: fk('installmentId').references(() => policyInstallments.id, {
      onDelete: 'set null',
    }),
    linkedBy: fk('linkedBy').references(() => user.id),
    linkedAt: integer('linkedAt', { mode: 'timestamp_ms' }),
  },
  (table) => [
    check(
      'conversation_entities_policy_insured_installment_xor',
      sql`(${table.policyId} IS NOT NULL) + (${table.insuredId} IS NOT NULL) + (${table.installmentId} IS NOT NULL) = 1`,
    ),
    index('conversation_entities_conversation_id_idx').on(table.conversationId),
    index('conversation_entities_policy_id_idx').on(table.policyId),
    index('conversation_entities_insured_id_idx').on(table.insuredId),
    index('conversation_entities_installment_id_idx').on(table.installmentId),
    index('conversation_entities_linked_by_idx').on(table.linkedBy),
  ],
)
