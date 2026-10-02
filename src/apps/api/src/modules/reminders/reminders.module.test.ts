import { describe, expect, it } from 'vitest'
import { createRemindersModule } from './reminders.module'

describe('createRemindersModule', () => {
  it('instantiates reminders module and exposes rules and orchestrator', () => {
    const mockDb = {} as D1Database
    const mockCommunications = {
      whatsappDispatch: {},
    } as any
    const mockInsurance = {
      policies: {},
    } as any

    const module = createRemindersModule({
      db: mockDb,
      communications: mockCommunications,
      insurance: mockInsurance,
    } as any)

    expect(module).toBeDefined()
    expect(module.rules).toBeDefined()
    expect(module.orchestrator).toBeDefined()
  })
})
