import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

import { enumCheck, fk, json, entity } from '../../shared'
import { messageDirection, senderKind } from '../../enums'
import { user, organization } from '@copas/auth'
import { insureds } from '../insurance'
import { conversations } from './conversations.schema'
import { messageTemplates } from './message-templates.schema'

export const messages = sqliteTable(
  'messages',
  {
    ...entity,
    conversationId: fk('conversationId', true),
    organizationId: fk('organizationId', true).references(
      () => organization.id,
      { onDelete: 'cascade' },
    ),
    templateId: fk('templateId').references(() => messageTemplates.id),
    direction: text('direction').notNull(),
    senderKind: text('senderKind').notNull(),
    senderUserId: fk('senderUserId').references(() => user.id),
    senderInsuredId: fk('senderInsuredId').references(() => insureds.id, {
      onDelete: 'set null',
    }),
    content: text('content').notNull(),
    deduplicationHash: text('deduplicationHash'),
    sentAt: integer('sentAt', { mode: 'timestamp_ms' }),
    metadata: json<Record<string, unknown>>('metadata'),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId, table.organizationId],
      foreignColumns: [conversations.id, conversations.organizationId],
    }),
    uniqueIndex('messages_org_dedup_uq').on(
      table.organizationId,
      table.deduplicationHash,
    ),
    index('messages_conversation_sent_at_idx').on(
      table.conversationId,
      table.sentAt,
    ),
    index('messages_template_id_idx').on(table.templateId),
    index('messages_sender_user_id_idx').on(table.senderUserId),
    index('messages_sender_insured_id_idx').on(table.senderInsuredId),
    enumCheck('messages_direction_check', sql`${table.direction}`, messageDirection),
    enumCheck('messages_sender_kind_check', sql`${table.senderKind}`, senderKind),
    check('messages_metadata_json', sql`json_valid(${table.metadata})`),
    check(
      'messages_sender_kind_coherence',
      sql`CASE ${table.senderKind}
        WHEN 'user' THEN (${table.senderUserId} IS NOT NULL) + (${table.senderInsuredId} IS NULL)
        WHEN 'insured' THEN (${table.senderInsuredId} IS NOT NULL) + (${table.senderUserId} IS NULL)
        WHEN 'system' THEN (${table.senderUserId} IS NULL) + (${table.senderInsuredId} IS NULL)
        WHEN 'agent' THEN (${table.senderUserId} IS NULL) + (${table.senderInsuredId} IS NULL)
      END = 1`),
  ],
)
