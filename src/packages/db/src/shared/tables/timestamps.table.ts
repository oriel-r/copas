import { sql } from 'drizzle-orm'
import { integer } from 'drizzle-orm/sqlite-core'

/**
 * Trazabilidad unificada para entidades de dominio mutables:
 * `createdAt`, `updatedAt` y `deletedAt` (soft-delete).
 *
 * Instantes en UTC epoch ms (`timestamp_ms`), coherente con `@copas/auth`.
 * @see DER §Convenciones: "Trazabilidad unificada"
 */
export const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
}