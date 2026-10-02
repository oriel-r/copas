import { describe, expect, it } from 'vitest'
import { createInsuranceModule } from './insurance.module'

describe('createInsuranceModule', () => {
  it('instantiates insurance module and exposes all insurance services', () => {
    const mockDb = {} as D1Database

    const module = createInsuranceModule({
      db: mockDb,
      organizationId: 'org-123',
    } as any)

    expect(module).toBeDefined()
    expect(module.policies).toBeDefined()
    expect(module.companies).toBeDefined()
    expect(module.branches).toBeDefined()
    expect(module.insureds).toBeDefined()
    expect(module.assets).toBeDefined()
    expect(module.files).toBeDefined()
  })

  it('instantiates insurance module without organizationId', () => {
    const mockDb = {} as D1Database

    const module = createInsuranceModule({
      db: mockDb,
    } as any)

    expect(module).toBeDefined()
    expect(module.policies).toBeDefined()
    expect(module.companies).toBeDefined()
    expect(module.branches).toBeDefined()
    expect(module.insureds).toBeDefined()
    expect(module.assets).toBeDefined()
    expect(module.files).toBeDefined()
  })
})
