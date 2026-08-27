import { describe, expect, it } from 'vitest'
import { extractedPolicySchema } from './extraction.schema'

describe('insurance extraction contracts', () => {
  it('should successfully parse valid extracted policy', () => {
    const validData = {
      company: { name: 'SANCOR', code: 'SANCOR_01' },
      branch: { code: 'AUTO' },
      policy: {
        policyNumber: 'POL-12345',
        premiumTotal: 150000,
        currency: 'ARS',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        billingFrequency: 'monthly',
      },
      insured: {
        fullName: 'JUAN PEREZ',
        cuit: '20123456789',
        email: 'juan@example.com',
        phone: '541112345678',
        birthDate: '1985-05-15',
      },
      assetType: { code: 'AUTO' },
      asset: { properties: { PATENTE: 'AB123CD' } },
      paymentMethod: { code: 'PAGO_MANUAL' },
      coverages: [{ name: 'TODO RIESGO', limit: 10000000, franchise: 50000 }],
      installments: [{ installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 12500 }],
    }

    const parsed = extractedPolicySchema.parse(validData)
    expect(parsed).toEqual(validData)
  })

  it('should reject invalid currency', () => {
    const invalidData = {
      company: { name: 'SANCOR', code: '' },
      branch: { code: 'AUTO' },
      policy: {
        policyNumber: 'POL-1',
        premiumTotal: 1000,
        currency: 'USD',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        billingFrequency: 'monthly',
      },
      insured: { fullName: 'ANA', cuit: '', email: '', phone: '', birthDate: '' },
      assetType: { code: 'AUTO' },
      asset: { properties: {} },
      paymentMethod: { code: 'PAGO_MANUAL' },
      coverages: [],
      installments: [{ installmentNumber: 1, dueDate: '2026-01-10', totalAmount: 1000 }],
    }

    expect(() => extractedPolicySchema.parse(invalidData)).toThrow()
  })
})
