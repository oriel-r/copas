import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { entity, enumCheck, fk, json } from '../../shared'
import { extractionStatus } from '../../enums'
import { user } from '@copas/auth'
import { policies } from '../insurance'

export const aiExtractionResults = sqliteTable(
  'ai_extraction_results',
  {
    ...entity,
    // TODO: make nullable — result is created before policy (link only).
    // Change to: fk('policyId').references(() => policies.id, { onDelete: 'cascade' }),
    policyId: fk('policyId', true).references(() => policies.id, {
      onDelete: 'cascade',
    }),
    // TODO: add document link column (e.g. documentUrl: text('documentUrl')).
    // Pending result holds only the R2 key; policies.documentUrl does not exist yet.
    status: text('status').notNull().default('pending'),
    result: json<Record<string, unknown>>('result'),
    corrections: json<Record<string, unknown>>('corrections'),
    reviewedBy: fk('reviewedBy').references(() => user.id),
    reviewedAt: integer('reviewedAt', { mode: 'timestamp_ms' }),
    model: text('model'),
  },
  (table) => [
    index('ai_extraction_results_policy_id_idx').on(table.policyId),
    index('ai_extraction_results_reviewed_by_idx').on(table.reviewedBy),
    enumCheck(
      'ai_extraction_results_status_check',
      sql`${table.status}`,
      extractionStatus,
    ),
    check('ai_extraction_results_result_json', sql`json_valid(${table.result})`),
    check(
      'ai_extraction_results_corrections_json',
      sql`json_valid(${table.corrections})`,
    ),
  ],
)
