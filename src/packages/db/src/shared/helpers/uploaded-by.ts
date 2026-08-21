import { fk } from './fk'

/**
 * Columna `uploaded_by`: quién registró la entidad (FK a `user.id`, obligatoria).
 * La referencia se declara en el schema con `.references(() => user.id, ...)`.
 * @see DER §Convenciones: "Tablas de carga de dominio llevan uploaded_by"
 * 
 * Must be a function to avoid drizzle-kit v1 detecting duplicate FK constraint names
 * when the same column object is reused across multiple tables.
 */
export const uploadedBy = () => fk('uploaded_by', true)
