export async function verifyMetaSignature(
  rawBody: string | ArrayBuffer,
  signatureHeader: string | null | undefined,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false
  }

  const signature = signatureHeader.substring(7)
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify', 'sign']
  )

  const data = typeof rawBody === 'string' ? encoder.encode(rawBody) : rawBody
  const signatureBytes = hexToBytes(signature)

  if (signatureBytes.length !== 32) return false

  return crypto.subtle.verify('HMAC', key, signatureBytes, data)
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
