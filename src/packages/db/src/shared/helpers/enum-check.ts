import { SQL, sql } from 'drizzle-orm'
import { check } from 'drizzle-orm/sqlite-core'

/**
 * CHECK de dominio para una columna enum, generando valores literales
 * `IN ('a','b',...)` (no placeholders) para que `drizzle-kit` los serialice
 * correctamente en la migración.
 */
export function enumCheck(
  name: string,
  column: SQL,
  values: readonly string[],
) {
  const literal = sql.raw(
    values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', '),
  )
  return check(name, sql`${column} IN (${literal})`)
}
