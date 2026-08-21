import { z } from 'zod'

export const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Moneda ISO 4217 (3 letras mayúsculas)')