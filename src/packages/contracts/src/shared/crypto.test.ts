import { describe, it, expect } from 'vitest'
import {
  encryptJson,
  decryptJson,
  type EncryptedVaultPayload,
} from './crypto'

describe('AES-256-GCM Cryptography (crypto)', () => {
  // 32-byte keys represented as 64-character hexadecimal strings
  const VALID_KEY_A = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  const VALID_KEY_B = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210'

  const sampleCredentials = {
    accessToken: 'test-meta-token-123',
    wabaId: '12345',
  }

  // =========================================================================
  // 1. Bidirectional Encryption & Decryption
  // =========================================================================
  describe('Bidirectional Encryption & Decryption', () => {
    it('encrypts and decrypts a JSON object containing credentials with 32-byte hex key', async () => {
      const encrypted = await encryptJson(sampleCredentials, VALID_KEY_A)
      const decrypted = await decryptJson<typeof sampleCredentials>(encrypted, VALID_KEY_A)

      expect(decrypted).toEqual(sampleCredentials)
    })

    it('encrypts and decrypts empty object ({})', async () => {
      const emptyObj = {}
      const encrypted = await encryptJson(emptyObj, VALID_KEY_A)
      const decrypted = await decryptJson(encrypted, VALID_KEY_A)

      expect(decrypted).toEqual(emptyObj)
    })

    it('encrypts and decrypts complex nested structures with arrays, numbers, booleans, and nulls', async () => {
      const complexData = {
        meta: {
          appId: 987654321,
          active: true,
          scopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
          config: {
            webhookUrl: 'https://api.copas.com/webhooks/whatsapp',
            retryLimit: 3,
            nullField: null,
          },
        },
      }

      const encrypted = await encryptJson(complexData, VALID_KEY_A)
      const decrypted = await decryptJson<typeof complexData>(encrypted, VALID_KEY_A)

      expect(decrypted).toEqual(complexData)
    })

    it('encrypts and decrypts array payloads', async () => {
      const arrayData = [
        { id: 1, name: 'primary' },
        { id: 2, name: 'secondary' },
      ]

      const encrypted = await encryptJson(arrayData, VALID_KEY_A)
      const decrypted = await decryptJson<typeof arrayData>(encrypted, VALID_KEY_A)

      expect(decrypted).toEqual(arrayData)
    })
  })

  // =========================================================================
  // 2. Format and Structure Validation
  // =========================================================================
  describe('EncryptedVaultPayload Format Validation', () => {
    it('returns a payload adhering to EncryptedVaultPayload contract (v=1, alg=AES-GCM-256)', async () => {
      const payload: EncryptedVaultPayload = await encryptJson(sampleCredentials, VALID_KEY_A)

      expect(payload).toBeDefined()
      expect(payload.v).toBe(1)
      expect(payload.alg).toBe('AES-GCM-256')

      // IV and ciphertext must be non-empty strings
      expect(typeof payload.iv).toBe('string')
      expect(payload.iv.length).toBeGreaterThan(0)

      expect(typeof payload.ciphertext).toBe('string')
      expect(payload.ciphertext.length).toBeGreaterThan(0)
    })

    it('encodes IV and ciphertext in valid base64 or hex format', async () => {
      const payload = await encryptJson(sampleCredentials, VALID_KEY_A)

      // Accepts either standard Base64 / Base64URL or Hex encoding
      const isBase64OrHex = (str: string) =>
        /^[A-Za-z0-9+/=_-]+$/.test(str) || /^[0-9a-fA-F]+$/.test(str)

      expect(isBase64OrHex(payload.iv)).toBe(true)
      expect(isBase64OrHex(payload.ciphertext)).toBe(true)
    })
  })

  // =========================================================================
  // 3. Non-deterministic IV & Randomness (AEAD standard)
  // =========================================================================
  describe('Non-deterministic IV and Ciphertext', () => {
    it('generates different IVs and ciphertexts for two encryptions of the same payload', async () => {
      const enc1 = await encryptJson(sampleCredentials, VALID_KEY_A)
      const enc2 = await encryptJson(sampleCredentials, VALID_KEY_A)

      expect(enc1.iv).not.toBe(enc2.iv)
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext)

      // Both must still successfully decrypt to the same source object
      const dec1 = await decryptJson(enc1, VALID_KEY_A)
      const dec2 = await decryptJson(enc2, VALID_KEY_A)

      expect(dec1).toEqual(sampleCredentials)
      expect(dec2).toEqual(sampleCredentials)
    })
  })

  // =========================================================================
  // 4. Security: Decryption with Wrong Key
  // =========================================================================
  describe('Wrong Key Decryption', () => {
    it('throws exception / rejects when attempting to decrypt with a different 32-byte key', async () => {
      const encrypted = await encryptJson(sampleCredentials, VALID_KEY_A)

      await expect(decryptJson(encrypted, VALID_KEY_B)).rejects.toThrow()
    })
  })

  // =========================================================================
  // 5. Tamper Resistance (AEAD Tag & Integrity Verification)
  // =========================================================================
  describe('Tamper Resistance & Integrity Verification', () => {
    it('throws exception when a single character in ciphertext is modified', async () => {
      const encrypted = await encryptJson(sampleCredentials, VALID_KEY_A)

      // Flip/replace a character in the ciphertext
      const originalCiphertext = encrypted.ciphertext
      const lastChar = originalCiphertext[originalCiphertext.length - 1]
      const replacementChar = lastChar === 'a' ? 'b' : 'a'
      const tamperedCiphertext = originalCiphertext.slice(0, -1) + replacementChar

      const tamperedPayload: EncryptedVaultPayload = {
        ...encrypted,
        ciphertext: tamperedCiphertext,
      }

      await expect(decryptJson(tamperedPayload, VALID_KEY_A)).rejects.toThrow()
    })

    it('throws exception when a single character in IV is modified', async () => {
      const encrypted = await encryptJson(sampleCredentials, VALID_KEY_A)

      // Flip/replace a character in IV
      const originalIv = encrypted.iv
      const firstChar = originalIv[0]
      const replacementChar = firstChar === 'A' ? 'B' : 'A'
      const tamperedIv = replacementChar + originalIv.slice(1)

      const tamperedPayload: EncryptedVaultPayload = {
        ...encrypted,
        iv: tamperedIv,
      }

      await expect(decryptJson(tamperedPayload, VALID_KEY_A)).rejects.toThrow()
    })

    it('throws exception when ciphertext is truncated', async () => {
      const encrypted = await encryptJson(sampleCredentials, VALID_KEY_A)

      const tamperedPayload: EncryptedVaultPayload = {
        ...encrypted,
        ciphertext: encrypted.ciphertext.slice(0, 4),
      }

      await expect(decryptJson(tamperedPayload, VALID_KEY_A)).rejects.toThrow()
    })

    it('throws exception when unsupported version or algorithm is provided in payload', async () => {
      const encrypted = await encryptJson(sampleCredentials, VALID_KEY_A)

      const invalidVersionPayload = {
        ...encrypted,
        v: 2 as any,
      }
      await expect(decryptJson(invalidVersionPayload, VALID_KEY_A)).rejects.toThrow()

      const invalidAlgPayload = {
        ...encrypted,
        alg: 'AES-CBC' as any,
      }
      await expect(decryptJson(invalidAlgPayload, VALID_KEY_A)).rejects.toThrow()
    })
  })

  // =========================================================================
  // 6. Invalid Secret Key Length Validation
  // =========================================================================
  describe('Key Length & Validation', () => {
    it.each([
      ['empty string', ''],
      ['short key (32 hex chars / 16 bytes)', '0123456789abcdef0123456789abcdef'],
      ['63 hex chars (off by 1)', VALID_KEY_A.slice(0, 63)],
      ['65 hex chars (off by 1)', `${VALID_KEY_A}a`],
      ['long key (128 hex chars / 64 bytes)', VALID_KEY_A + VALID_KEY_A],
      ['non-hex characters of 64 chars', 'g'.repeat(64)],
      ['non-hex special characters of 64 chars', '!@#$%^&*()_+~|}{[]:;?><,./-='.repeat(2).slice(0, 64)],
    ])('rejects encryptJson with %s', async (_, invalidKey) => {
      await expect(encryptJson(sampleCredentials, invalidKey)).rejects.toThrow()
    })

    it.each([
      ['empty string', ''],
      ['short key (32 hex chars)', '0123456789abcdef0123456789abcdef'],
      ['63 hex chars', VALID_KEY_A.slice(0, 63)],
      ['65 hex chars', `${VALID_KEY_A}a`],
      ['non-hex characters of 64 chars', 'z'.repeat(64)],
    ])('rejects decryptJson with %s', async (_, invalidKey) => {
      const dummyPayload: EncryptedVaultPayload = {
        v: 1,
        alg: 'AES-GCM-256',
        iv: 'YWJjZGVmZ2hpamts',
        ciphertext: 'bWFsZm9ybWVkY2lwaGVydGV4dAo=',
      }

      await expect(decryptJson(dummyPayload, invalidKey)).rejects.toThrow()
    })
  })
})
