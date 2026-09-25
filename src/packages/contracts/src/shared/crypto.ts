export interface EncryptedVaultPayload {
  v: 1
  alg: 'AES-GCM-256'
  iv: string // Hex encoded 12-byte IV
  ciphertext: string // Hex encoded ciphertext
}

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('Invalid hex string.')
  }
  const result = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return result
}

function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getCryptoKey(secretKeyHex: string) {
  if (typeof secretKeyHex !== 'string' || secretKeyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(secretKeyHex)) {
    throw new Error('Invalid secret key: must be a 64-character hex string.')
  }
  const webCrypto: any = (globalThis as any).crypto
  const keyBuffer = hexToUint8Array(secretKeyHex)
  return webCrypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptJson(data: unknown, secretKeyHex: string): Promise<EncryptedVaultPayload> {
  const webCrypto: any = (globalThis as any).crypto
  const key = await getCryptoKey(secretKeyHex)
  const iv = webCrypto.getRandomValues(new Uint8Array(12))
  const encodedData = new TextEncoder().encode(JSON.stringify(data))

  const encryptedBuffer = await webCrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  )

  return {
    v: 1,
    alg: 'AES-GCM-256',
    iv: uint8ArrayToHex(iv),
    ciphertext: uint8ArrayToHex(new Uint8Array(encryptedBuffer))
  }
}

export async function decryptJson<T>(payload: EncryptedVaultPayload, secretKeyHex: string): Promise<T> {
  if (payload.v !== 1 || payload.alg !== 'AES-GCM-256') {
    throw new Error('Invalid payload version or algorithm.')
  }

  const webCrypto: any = (globalThis as any).crypto
  const key = await getCryptoKey(secretKeyHex)
  const iv = hexToUint8Array(payload.iv)
  const encryptedData = hexToUint8Array(payload.ciphertext)

  const decryptedBuffer = await webCrypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  )

  const decodedData = new TextDecoder().decode(decryptedBuffer)
  return JSON.parse(decodedData) as T
}
