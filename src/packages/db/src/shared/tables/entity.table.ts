import { id } from './id.table'
import { timestamps } from './timestamps.table'

/**
 * Entidad de dominio mutable: PK (UUID v7) + trazabilidad unificada
 * (`createdAt`, `updatedAt`, `deletedAt` con soft-delete).
 * @see DER §Convenciones: "Trazabilidad unificada"
 */
export const entity = {
  ...id,
  ...timestamps,
}
