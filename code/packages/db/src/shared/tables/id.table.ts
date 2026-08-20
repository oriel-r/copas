import { text } from 'drizzle-orm/sqlite-core'
import { uuidv7 } from 'uuidv7'

/**
 * PK de texto (UUID v7) generado en aplicación.
 * @see DER: IDs `text` generados en app con UUID v7.
 */
export const id = {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
}
