import { drizzle } from 'drizzle-orm/d1'
import { dbRelations } from '@copas/db/schemas'

export function createDatabase(database: D1Database) {
  return drizzle(database, {
    relations: dbRelations,
  })
}
