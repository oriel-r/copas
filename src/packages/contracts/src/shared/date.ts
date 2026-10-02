import { z } from 'zod'

export const dateCivilSchema = z.iso.date('Fecha inválida (YYYY-MM-DD)')

/**
 * Returns today's civil date in Argentina timezone (America/Argentina/Buenos_Aires) formatted as YYYY-MM-DD.
 */
export function getTodayArgentina(timestamp?: number): string {
  const d = timestamp ? new Date(timestamp) : new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(d)
}