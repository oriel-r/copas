import { text } from 'drizzle-orm/sqlite-core'

export const fk = (name: string, required = false) =>
  required ? text(name).notNull() : text(name)