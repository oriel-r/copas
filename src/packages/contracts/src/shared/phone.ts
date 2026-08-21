import { z } from 'zod'

export const phoneSchema = z.string().regex(/^\+?[\d\s()-]{6,20}$/, 'Teléfono inválido')