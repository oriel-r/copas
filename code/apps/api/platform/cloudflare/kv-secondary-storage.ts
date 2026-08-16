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
  }
}
