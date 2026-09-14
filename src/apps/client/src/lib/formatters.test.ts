import { describe, expect, it } from 'vitest'
import * as formattersModule from './formatters'

const formatCurrency: (amount?: number | null, currency?: string | null) => string =
  (formattersModule as any).formatCurrency

describe('formatters - formatCurrency', () => {
  describe('Given standard amounts in Argentine Pesos (ARS)', () => {
    it('should format whole integer amounts with thousands separators and decimals', () => {
      const formatted = formatCurrency(125000)
      // Normalizes non-breaking spaces (U+00A0 / \u00a0) to regular spaces
      const normalized = formatted.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ')
      expect(normalized).toMatch(/\$\s*125\.000,00/)
    })

    it('should format amounts with decimal cents', () => {
      const formatted = formatCurrency(125000.5)
      const normalized = formatted.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ')
      expect(normalized).toMatch(/\$\s*125\.000,50/)
    })

    it('should format zero correctly', () => {
      const formatted = formatCurrency(0)
      const normalized = formatted.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ')
      expect(normalized).toMatch(/\$\s*0,00/)
    })

    it('should format small decimal amounts below 1', () => {
      const formatted = formatCurrency(0.75)
      const normalized = formatted.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ')
      expect(normalized).toMatch(/\$\s*0,75/)
    })

    it('should format large values with multiple thousand separators', () => {
      const formatted = formatCurrency(12500000)
      const normalized = formatted.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ')
      expect(normalized).toMatch(/\$\s*12\.500\.000,00/)
    })
  })

  describe('Given negative numbers and boundary values', () => {
    it('should format negative values accurately', () => {
      const formatted = formatCurrency(-5000)
      const normalized = formatted.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ')
      expect(normalized).toMatch(/-\s*\$?\s*5\.000,00|\$\s*-\s*5\.000,00/)
    })

    it('should handle null or undefined safely without throwing', () => {
      expect(() => formatCurrency(null as any)).not.toThrow()
      expect(() => formatCurrency(undefined as any)).not.toThrow()
      const resNull = formatCurrency(null as any)
      expect(typeof resNull).toBe('string')
    })

    it('should handle NaN without throwing and return a fallback or zero representation', () => {
      expect(() => formatCurrency(Number.NaN)).not.toThrow()
      const resNaN = formatCurrency(Number.NaN)
      expect(typeof resNaN).toBe('string')
    })
  })

  describe('Given currency parameter variations', () => {
    it('should default to ARS or peso symbol when currency is omitted', () => {
      const formatted = formatCurrency(1000)
      expect(formatted).toContain('$')
    })

    it('should format ARS explicitly', () => {
      const formatted = formatCurrency(1000, 'ARS')
      const normalized = formatted.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ')
      expect(normalized).toMatch(/\$\s*1\.000,00/)
    })

    it('should format foreign currencies like USD appropriately', () => {
      const formatted = formatCurrency(1000, 'USD')
      const normalized = formatted.replace(/\u00a0/g, ' ')
      expect(normalized).toMatch(/(USD|US\$|\$)\s*1\.000,00|(USD|\$)\s*1,000\.00/)
    })
  })
})
