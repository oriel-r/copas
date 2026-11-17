import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

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

type CompactTokenBase = {
  typ?: string
  exp?: number
  s?: string
  nonce?: string
}

function signCompactToken(payload: CompactTokenBase, secret: string): string {
  if (!secret) {
    throw new Error('Cannot sign token with empty secret')
  }
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

function verifyCompactToken<T extends CompactTokenBase>(
  token: string | undefined,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): T | null {
  if (!secret || !token) return null
  const parts = token.trim().split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null

  const [encoded, providedSig] = parts
  const expectedSig = createHmac('sha256', secret).update(encoded).digest('base64url')
  if (!timingSafeCompareStrings(providedSig, expectedSig)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp) || parsed.exp < nowSec) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Issues an HMAC-SHA256 invite token scoped to a single WAHA session and short TTL. */
export function signQrInviteToken(params: {
  session: string
  ttlSeconds: number
  secret: string
  nowSec?: number
}): string {
  const nowSec = params.nowSec ?? Math.floor(Date.now() / 1000)
  const ttl = Math.max(60, Math.min(params.ttlSeconds, 7200))
  return signCompactToken(
    {
      typ: 'qr_invite',
      s: params.session,
      exp: nowSec + ttl,
    },
    params.secret,
  )
}

/** Verifies signature, expiration, and exact session binding of a scoped QR invite token. */
export function verifyQrInviteToken(
  token: string | undefined,
  expectedSession: string,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): { valid: boolean; exp?: number } {
  const parsed = verifyCompactToken<CompactTokenBase>(token, secret, nowSec)
  if (!parsed || parsed.typ !== 'qr_invite' || parsed.s !== expectedSession) {
    return { valid: false }
  }
  return { valid: true, exp: parsed.exp }
}

/** Issues a signed HttpOnly cookie token for admin QR portal browser sessions. */
export function signAdminSessionCookie(params: {
  ttlSeconds: number
  secret: string
  nowSec?: number
}): string {
  const nowSec = params.nowSec ?? Math.floor(Date.now() / 1000)
  return signCompactToken(
    {
      typ: 'qr_admin',
      nonce: randomBytes(8).toString('hex'),
      exp: nowSec + Math.max(60, params.ttlSeconds),
    },
    params.secret,
  )
}

/** Validates an HMAC-signed admin session cookie against the portal signing secret. */
export function verifyAdminSessionCookie(
  cookieValue: string | undefined,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  const parsed = verifyCompactToken<CompactTokenBase>(cookieValue, secret, nowSec)
  return Boolean(parsed && parsed.typ === 'qr_admin')
}

export function parseCookieHeader(cookieHeader: string | undefined, cookieName: string): string {
  if (!cookieHeader || !cookieName) return ''
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const key = part.slice(0, idx).trim()
    if (key === cookieName) {
      return decodeURIComponent(part.slice(idx + 1).trim())
    }
  }
  return ''
}
