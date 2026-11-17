import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

function sha256Buffer(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

export function timingSafeCompareStrings(a: string, b: string): boolean {
  const bufA = sha256Buffer(a)
  const bufB = sha256Buffer(b)
  return timingSafeEqual(bufA, bufB)
}

export function verifyBearerToken(
  authorizationHeader: string | undefined,
  allowedTokens: string[],
): boolean {
  if (!authorizationHeader || allowedTokens.length === 0) {
    return false
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim())
  if (!match) return false

  const provided = match[1].trim()
  if (!provided) return false

  let matched = false
  for (const token of allowedTokens) {
    if (token && timingSafeCompareStrings(provided, token)) {
      matched = true
    }
  }
  return matched
}

export function verifyWahaWebhookHmac(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!secret) return true
  if (!signatureHeader) return false

  const cleanSig = signatureHeader.trim().replace(/^sha512=/i, '')
  if (!/^[0-9a-fA-F]{128}$/.test(cleanSig)) {
    return false
  }

  const expectedHex = createHmac('sha512', secret).update(rawBody).digest('hex')
  return timingSafeEqual(
    Buffer.from(cleanSig.toLowerCase(), 'utf8'),
    Buffer.from(expectedHex.toLowerCase(), 'utf8'),
  )
}

export function signMetaWebhookPayload(rawBody: string | Buffer, metaAppSecret: string): string {
  const digest = createHmac('sha256', metaAppSecret).update(rawBody).digest('hex')
  return `sha256=${digest}`
}
