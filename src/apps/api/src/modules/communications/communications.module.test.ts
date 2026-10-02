import { describe, expect, it } from 'vitest'
import { createCommunicationsModule } from './communications.module'

describe('createCommunicationsModule', () => {
  it('instantiates the communications module and exposes all required services', () => {
    const mockDb = {} as D1Database
    const mockQueue = {} as Queue

    const module = createCommunicationsModule({
      db: mockDb,
      whatsappQueue: mockQueue,
    } as any)

    expect(module).toBeDefined()
    expect(module.conversations).toBeDefined()
    expect(module.messages).toBeDefined()
    expect(module.channelEndpoints).toBeDefined()
    expect(module.consents).toBeDefined()
    expect(module.whatsappDispatch).toBeDefined()
  })
})
