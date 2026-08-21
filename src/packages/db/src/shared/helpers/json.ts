import { text } from 'drizzle-orm/sqlite-core'

/**
 * Columna JSON como texto (con `json_valid` en el CHECK de la tabla). La
 * validación de forma se hace en la capa de aplicación.
 * @see DER §Convenciones: "json: texto JSON validado (json_valid)"
 */
export const json = <T>(name: string) =>
  text(name, { mode: 'json' }).$type<T>()
