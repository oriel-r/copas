import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable } from 'drizzle-orm/sqlite-core'

import { entity, fk } from '../../shared'
import { user } from '@copas/auth'
import { insureds } from '../insurance'
import { conversations } from './conversations.schema'

export const conversationParticipants = sqliteTable(
  'conversation_participants',
  {
    ...entity,
    conversationId: fk('conversationId', true).references(
      () => conversations.id,
      { onDelete: 'cascade' },
    ),
    userId: fk('userId').references(() => user.id),
    insuredId: fk('insuredId').references(() => insureds.id, {
      onDelete: 'cascade',
    }),
    joinedAt: integer('joinedAt', { mode: 'timestamp_ms' }),
  },
  (table) => [
    check(
      'conversation_participants_user_insured_xor',
      sql`(${table.userId} IS NOT NULL) + (${table.insuredId} IS NOT NULL) = 1`,
    ),
    index('conversation_participants_conversation_id_idx').on(
      table.conversationId,
    ),
    index('conversation_participants_user_id_idx').on(table.userId),
    index('conversation_participants_insured_id_idx').on(table.insuredId),
  ],
)
