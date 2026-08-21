import { z } from 'zod'

export const dateCivilSchema = z.iso.date('Fecha inválida (YYYY-MM-DD)')