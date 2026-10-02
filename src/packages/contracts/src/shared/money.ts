import { z } from 'zod'

export const moneySchema = z.number().int('Monto inválido (centavos enteros)')