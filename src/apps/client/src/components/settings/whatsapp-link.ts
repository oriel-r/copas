import { phoneSchema } from '@copas/contracts'

export const QR_REQUEST_WHATSAPP_NUMBER = '543718446327'
export const ARGENTINA_MOBILE_PREFIX = '+54 9 '

const PREFIX_TRIMMED = '+54 9'

/**
 * Formatea la entrada del teléfono anteponiendo automáticamente "+54 9 "
 * para que el usuario solo ingrese el código de área y el número.
 */
export function formatAgencyPhoneInput(rawValue: string, previousValue = ''): string {
  if (!rawValue) return ''

  // Permite borrar el prefijo completo con Backspace cuando no hay dígitos locales.
  if (
    previousValue.startsWith(ARGENTINA_MOBILE_PREFIX) &&
    rawValue.length < ARGENTINA_MOBILE_PREFIX.length &&
    ARGENTINA_MOBILE_PREFIX.startsWith(rawValue)
  ) {
    return ''
  }

  let rest = rawValue.trimStart()

  // Evita duplicar prefijo si el usuario pega o escribe manualmente +54 9 / 549.
  if (rest.startsWith(ARGENTINA_MOBILE_PREFIX)) {
    rest = rest.slice(ARGENTINA_MOBILE_PREFIX.length)
  }

  if (/^\+?54\s*9(?:\s+|$|(?=\d))/.test(rest)) {
    rest = rest.replace(/^\+?54\s*9\s*/, '')
  }

  rest = rest.replace(/^\s+/, '')

  return `${ARGENTINA_MOBILE_PREFIX}${rest}`
}

/**
 * Valida el teléfono de la agencia reutilizando el schema compartido de contratos.
 */
export function validateAgencyPhone(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === PREFIX_TRIMMED) {
    return 'Ingresá el número de teléfono de la agencia'
  }

  const parsed = phoneSchema.safeParse(trimmed)
  if (!parsed.success) {
    return 'Ingresá un teléfono válido (ej: +54 9 11 1234-5678)'
  }

  if (trimmed.startsWith(PREFIX_TRIMMED)) {
    const localDigits = trimmed.slice(PREFIX_TRIMMED.length).replace(/\D/g, '')
    if (localDigits.length < 6) {
      return 'Ingresá el código de área y el número completo (ej: 11 1234-5678)'
    }
  }

  return null
}

/**
 * Construye el enlace wa.me prellenado para solicitar el QR de vinculación.
 */
export function buildQrRequestWhatsAppUrl(phone: string, agencyName?: string | null): string {
  const cleanPhone = phone.trim()
  const cleanAgencyName = agencyName?.trim()

  const message = cleanAgencyName
    ? `Hola, ya cargué el número (${cleanPhone}) de la agencia ${cleanAgencyName}, pasame el link para vincular`
    : `Hola, ya cargué el número (${cleanPhone}), pasame el link para vincular`

  return `https://wa.me/${QR_REQUEST_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
