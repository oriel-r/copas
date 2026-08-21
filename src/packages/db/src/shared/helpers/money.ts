import { integer, text } from 'drizzle-orm/sqlite-core'

/**
 * Dinero como integer en centavos (nunca REAL/float), acompañado de moneda
 * ISO 4217 (default `'ARS'`).
 * @see DER §Convenciones: "decimal: dinero con 2 decimales ... integer en centavos"
 */
export const money = (name: string) =>
  integer(name).notNull().default(0)

/**
 * Moneda ISO 4217, default `'ARS'`. Presente en toda tabla con montos.
 */
export const currency = (name = 'currency') =>
  text(name).notNull().default('ARS')
