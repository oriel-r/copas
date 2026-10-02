import { drizzle } from 'drizzle-orm/d1'
import { dbRelations } from '@copas/db/schemas'

export function createDatabase(database: any) {
  return drizzle(database, {
    relations: dbRelations,
  })
}
