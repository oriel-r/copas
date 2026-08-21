import { describe, expect, it, vi } from 'vitest'
import { createKvSecondaryStorage } from './kv-secondary-storage'

function createNamespace() {
  return {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  } as unknown as KVNamespace & {
    get: ReturnType<typeof vi.fn>
    put: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
}

describe('createKvSecondaryStorage', () => {
  it('reads the raw Better Auth value', async () => {
    const namespace = createNamespace()
    namespace.get.mockResolvedValue('{"session":"value"}')
    const storage = createKvSecondaryStorage(namespace)

    await expect(storage.get('session-token')).resolves.toBe(
      '{"session":"value"}',
    )
    expect(namespace.get).toHaveBeenCalledWith('session-token')
  })

  it('writes values without an expiration when no TTL is provided', async () => {
    const namespace = createNamespace()
    const storage = createKvSecondaryStorage(namespace)

    await storage.set('session-token', 'value')

    expect(namespace.put).toHaveBeenCalledWith('session-token', 'value')
  })

  it('enforces the KV minimum expiration TTL', async () => {
    const namespace = createNamespace()
    const storage = createKvSecondaryStorage(namespace)

    await storage.set('session-token', 'value', 10)

    expect(namespace.put).toHaveBeenCalledWith(
      'session-token',
      'value',
      { expirationTtl: 60 },
    )
  })

  it('preserves a valid expiration TTL', async () => {
    const namespace = createNamespace()
    const storage = createKvSecondaryStorage(namespace)

    await storage.set('session-token', 'value', 300)

    expect(namespace.put).toHaveBeenCalledWith(
      'session-token',
      'value',
      { expirationTtl: 300 },
    )
  })

  it('deletes values', async () => {
    const namespace = createNamespace()
    const storage = createKvSecondaryStorage(namespace)

    await storage.delete('session-token')

    expect(namespace.delete).toHaveBeenCalledWith('session-token')
  })
})
