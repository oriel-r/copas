import { drizzle } from 'drizzle-orm/d1'
import { authSchema } from '@copas/auth-db'

export function createDatabase(database: D1Database) {
  return drizzle(database, {
    schema: authSchema,
  })
}
