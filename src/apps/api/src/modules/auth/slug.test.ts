import { describe, expect, it } from 'vitest'

describe('Slug utility (generateSlug / sanitizeSlug)', () => {
  async function loadSlugFn(): Promise<(input: string) => string> {
    try {
      // @ts-ignore
      const mod = await import('./slug')
      return mod.sanitizeSlug ?? mod.generateSlug
    } catch {
      throw new Error('Slug utility (./slug.ts) is not implemented yet')
    }
  }

  describe('Sanitization & Normalization', () => {
    it.each([
      ['Mi Agencia', 'mi-agencia'],
      ['AGENCIA DEL SUR', 'agencia-del-sur'],
      ['Seguros & Asociados', 'seguros-asociados'],
      ['  Ágencia de Seguros Ñandú  ', 'agencia-de-seguros-nandu'],
      ['Seguros Martínez & Cía. S.A.', 'seguros-martinez-cia-sa'],
      ['Alpha---Beta___Gamma', 'alpha-beta-gamma'],
      ['--Leading and Trailing--', 'leading-and-trailing'],
      ['Special Characters @#$%^&*()', 'special-characters'],
      ['Multiple     Spaces', 'multiple-spaces'],
      ['123 Numbers & 456 Codes', '123-numbers-456-codes'],
    ])('sanitizes "%s" to "%s"', async (input, expected) => {
      const slugify = await loadSlugFn()
      const slug = slugify(input)
      expect(slug).toBe(expected)
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty string and whitespace-only strings', async () => {
      const slugify = await loadSlugFn()
      expect(slugify('')).toBe('')
      expect(slugify('    ')).toBe('')
    })

    it('handles string with only special characters', async () => {
      const slugify = await loadSlugFn()
      expect(slugify('!@#$%^&*()_+')).toBe('')
    })

    it('preserves alphanumeric sequences without modifying them', async () => {
      const slugify = await loadSlugFn()
      expect(slugify('agencia123')).toBe('agencia123')
    })
  })
})
