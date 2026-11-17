import { z } from 'zod'

export const phoneSchema = z.string().regex(/^\+?[\d\s()-]{6,20}$/, 'Teléfono inválido')

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Generates normalized digit candidates for matching Argentine mobile numbers
 * (+54 9 ... vs 54 ...) as well as standard international numbers.
 */
export function buildPhoneDigitCandidates(phone: string): string[] {
  const digits = normalizePhoneDigits(phone)
  if (!digits) return []
  const candidates = new Set<string>([digits])
  if (digits.startsWith('549') && digits.length >= 12) {
    candidates.add(`54${digits.slice(3)}`)
  } else if (digits.startsWith('54') && !digits.startsWith('549') && digits.length >= 11) {
    candidates.add(`549${digits.slice(2)}`)
  }
  return Array.from(candidates)
}
