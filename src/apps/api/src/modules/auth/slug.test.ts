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

  describe('Export verification', () => {
    it('exports generateSlug or sanitizeSlug as functions', async () => {
      // @ts-ignore
      const mod = await import('./slug')
      const fn = mod.sanitizeSlug ?? mod.generateSlug
      expect(typeof fn).toBe('function')
      if (mod.generateSlug && mod.sanitizeSlug) {
        expect(mod.generateSlug('Test Slug')).toBe(mod.sanitizeSlug('Test Slug'))
      }
    })
  })

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
      ['áéíóú ÁÉÍÓÚ ñÑ üÜ', 'aeiou-aeiou-nn-uu'],
      ['foo_bar_baz', 'foo-bar-baz'],
      ['foo.bar.baz', 'foobarbaz'],
      ['foo--bar--baz', 'foo-bar-baz'],
      ['---foo---', 'foo'],
      ['hello\n\tworld', 'hello-world'],
      ['copas-app', 'copas-app'],
    ])('sanitizes "%s" to "%s"', async (input, expected) => {
      const slugify = await loadSlugFn()
      const slug = slugify(input)
      expect(slug).toBe(expected)
      if (expected.length > 0) {
        expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles null and undefined input gracefully', async () => {
      const slugify = await loadSlugFn()
      expect((slugify as any)(null)).toBe('')
      expect((slugify as any)(undefined)).toBe('')
    })

    it('handles empty string and whitespace-only strings', async () => {
      const slugify = await loadSlugFn()
      expect(slugify('')).toBe('')
      expect(slugify(' ')).toBe('')
      expect(slugify('    ')).toBe('')
      expect(slugify('\t\n\r')).toBe('')
    })

    it('handles string with only special characters', async () => {
      const slugify = await loadSlugFn()
      expect(slugify('!@#$%^&*()_+')).toBe('')
      expect(slugify('---')).toBe('')
      expect(slugify('___')).toBe('')
      expect(slugify('...')).toBe('')
      expect(slugify('///')).toBe('')
    })

    it('preserves alphanumeric sequences without modifying them', async () => {
      const slugify = await loadSlugFn()
      expect(slugify('agencia123')).toBe('agencia123')
      expect(slugify('123')).toBe('123')
      expect(slugify('a')).toBe('a')
      expect(slugify('Z')).toBe('z')
    })

    it('handles single character cases', async () => {
      const slugify = await loadSlugFn()
      expect(slugify('A')).toBe('a')
      expect(slugify('9')).toBe('9')
      expect(slugify('-')).toBe('')
      expect(slugify('!')).toBe('')
    })
  })
})
