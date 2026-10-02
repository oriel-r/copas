import { text } from 'drizzle-orm/sqlite-core'

/**
 * Fecha civil (un día calendario, no un instante): texto ISO `YYYY-MM-DD`
 * sin timezone. Aplica a `due_date`, `birth_date`, `start_date`, `end_date`,
 * `effective_end_date`, `period_start`, `period_end`.
 * @see DER §Convenciones: "Fechas civiles (date): ... texto ISO YYYY-MM-DD"
 */
export const dateCivil = (name: string) => text(name)
