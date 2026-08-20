import type { SecondaryStorage } from 'better-auth'

export function createKvSecondaryStorage(
  namespace: KVNamespace,
): SecondaryStorage {
  return {
    get(key) {
      return namespace.get(key)
    },

    async set(key, value, ttl) {
      if (ttl === undefined) {
        await namespace.put(key, value)
        return
      }

      await namespace.put(key, value, {
        expirationTtl: Math.max(60, ttl),
      })
    },

    delete(key) {
      return namespace.delete(key)
    },

    async getAndDelete(key) {
      const value = await namespace.get(key)
      await namespace.delete(key)
      return value
    },

    async increment(key) {
      const current = (await namespace.get(key)) || '0'
      const next = parseInt(current, 10) + 1
      await namespace.put(key, String(next))
      return next
    },
  }
}
