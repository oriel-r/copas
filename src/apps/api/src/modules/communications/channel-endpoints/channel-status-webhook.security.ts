function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null
  }
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * Verifies an `X-Hub-Signature-256` (`sha256=<hex>`) header using constant-time Web Crypto HMAC.
 */
export async function verifyWebhookHmacSha256(
  rawBody: string | ArrayBuffer,
  signatureHeader: string | null | undefined,
  secret: string,
): Promise<boolean> {
  if (!secret || !signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false
  }

  const signatureBytes = hexToBytes(signatureHeader.slice(7).trim())
  if (!signatureBytes || signatureBytes.length !== 32) {
    return false
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const data = typeof rawBody === 'string' ? encoder.encode(rawBody) : rawBody
  return crypto.subtle.verify('HMAC', key, signatureBytes, data)
}
