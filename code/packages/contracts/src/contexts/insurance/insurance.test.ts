import { describe, expect, it } from 'vitest'

import {
  createPolicyRequestSchema,
  policyResponseSchema,
} from './policies'
import { createInsuredRequestSchema } from './insureds'
import { paginationSchema } from '../../shared'

const validUuidV7 = '0190c0c8-0000-7000-8000-000000000000'

describe('policies contracts', () => {
  it('acepta un create request válido', () => {
    const result = createPolicyRequestSchema.safeParse({
      companyId: validUuidV7,
      insuredId: validUuidV7,
      policyNumber: 'POL-001',
      premiumTotal: 150000,
      currency: 'ARS',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      status: 'active',
      billingFrequency: 'monthly',
    })
    expect(result.success).toBe(true)
  })

  it('acepta campos opcionales omitidos', () => {
    const result = createPolicyRequestSchema.safeParse({
      companyId: validUuidV7,
      insuredId: validUuidV7,
      policyNumber: 'POL-002',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza endDate anterior a startDate', () => {
    const result = createPolicyRequestSchema.safeParse({
      companyId: validUuidV7,
      insuredId: validUuidV7,
      policyNumber: 'POL-003',
      startDate: '2024-12-01',
      endDate: '2024-01-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['endDate'])
    }
  })

  it('rechaza un enum de estado inválido', () => {
    const result = createPolicyRequestSchema.safeParse({
      companyId: validUuidV7,
      insuredId: validUuidV7,
      policyNumber: 'POL-004',
      status: 'invalid_status',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza una moneda fuera de ISO 4217', () => {
    const result = createPolicyRequestSchema.safeParse({
      companyId: validUuidV7,
      insuredId: validUuidV7,
      policyNumber: 'POL-005',
      currency: 'pesos',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza un monto decimal', () => {
    const result = createPolicyRequestSchema.safeParse({
      companyId: validUuidV7,
      insuredId: validUuidV7,
      policyNumber: 'POL-006',
      premiumTotal: 100.5,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza IDs que no sean UUID v7', () => {
    const result = createPolicyRequestSchema.safeParse({
      companyId: 'not-a-uuid',
      insuredId: validUuidV7,
      policyNumber: 'POL-007',
    })
    expect(result.success).toBe(false)
  })

  it('el response schema acepta una fila completa', () => {
    const result = policyResponseSchema.safeParse({
      id: validUuidV7,
      organizationId: validUuidV7,
      companyId: validUuidV7,
      insuredId: validUuidV7,
      paymentMethodId: null,
      uploadedBy: validUuidV7,
      producedBy: null,
      policyNumber: 'POL-001',
      premiumTotal: 150000,
      currency: 'ARS',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      effectiveEndDate: null,
      status: 'active',
      billingFrequency: 'monthly',
      documentUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('insureds contracts', () => {
  it('acepta un CUIT válido', () => {
    const result = createInsuredRequestSchema.safeParse({
      cuit: '20-34567890-6',
      fullName: 'Juan Pérez',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza un CUIT con dígito verificador inválido', () => {
    const result = createInsuredRequestSchema.safeParse({
      cuit: '20-34567890-5',
      fullName: 'Juan Pérez',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza un CUIT con formato inválido', () => {
    const result = createInsuredRequestSchema.safeParse({
      cuit: '2034567890',
      fullName: 'Juan Pérez',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza un email inválido', () => {
    const result = createInsuredRequestSchema.safeParse({
      cuit: '20-34567890-6',
      fullName: 'Juan Pérez',
      email: 'no-es-un-email',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza una fecha de nacimiento inválida', () => {
    const result = createInsuredRequestSchema.safeParse({
      cuit: '20-34567890-6',
      fullName: 'Juan Pérez',
      birthDate: '31/01/2000',
    })
    expect(result.success).toBe(false)
  })
})

describe('pagination schema', () => {
  it('coercea query params desde strings', () => {
    const result = paginationSchema.safeParse({
      limit: '50',
      offset: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ limit: 50, offset: 10, cursor: undefined })
    }
  })

  it('aplica defaults', () => {
    const result = paginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ limit: 25, offset: 0, cursor: undefined })
    }
  })

  it('rechaza un limit fuera de rango', () => {
    const result = paginationSchema.safeParse({ limit: 500 })
    expect(result.success).toBe(false)
  })
})