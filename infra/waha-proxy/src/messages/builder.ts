import type {
  MetaContact,
  MetaInteractive,
  MetaSendMessageRequest,
  MetaTemplateComponent,
  MetaTemplateParameter,
  OutboundAction,
  TemplatesConfigFile,
} from '../types.ts'

export class MetaApiError extends Error {
  readonly httpStatus: number
  readonly metaCode: number
  readonly metaType: string

  constructor(httpStatus: number, metaCode: number, metaType: string, message: string) {
    super(message)
    this.name = 'MetaApiError'
    this.httpStatus = httpStatus
    this.metaCode = metaCode
    this.metaType = metaType
  }
}

export function normalizePhoneDigits(rawPhone: string): string {
  const digits = String(rawPhone || '').replace(/\D/g, '')
  if (digits.length < 6 || digits.length > 20) {
    throw new MetaApiError(400, 100, 'OAuthException', 'Invalid recipient phone number')
  }
  const arMobileMatch = /^54(?!9)(\d{10})$/.exec(digits)
  if (arMobileMatch) {
    return `549${arMobileMatch[1]}`
  }
  return digits
}

export function toWahaChatId(phoneOrDigits: string): string {
  if (phoneOrDigits.includes('@')) {
    return phoneOrDigits
  }
  const digits = normalizePhoneDigits(phoneOrDigits)
  return `${digits}@c.us`
}

function extractParameterValue(param: MetaTemplateParameter): string {
  if (param.type === 'text') {
    return param.text ?? ''
  }
  if (param.type === 'currency') {
    if (param.currency?.fallback_value) return param.currency.fallback_value
    if (typeof param.currency?.amount_1000 === 'number') {
      const value = (param.currency.amount_1000 / 1000).toFixed(2)
      return param.currency.code ? `${param.currency.code} ${value}` : value
    }
    return ''
  }
  if (param.type === 'date_time') {
    return param.date_time?.fallback_value ?? param.dateTime?.fallback_value ?? ''
  }
  if (param.type === 'image') {
    return param.image?.link ?? ''
  }
  if (param.type === 'document') {
    return param.document?.link ?? param.document?.filename ?? ''
  }
  return param.text ?? ''
}

function resolveTemplateString(
  templateName: string,
  languageCode: string | undefined,
  templatesConfig: TemplatesConfigFile,
): string {
  const entry = templatesConfig.templates?.[templateName]
  if (!entry) {
    throw new MetaApiError(
      404,
      132001,
      'OAuthException',
      `Template name "${templateName}" does not exist in local templates configuration`,
    )
  }

  if (languageCode && entry[languageCode]) {
    return entry[languageCode]
  }
  if (entry.default) {
    return entry.default
  }
  const firstLang = Object.values(entry)[0]
  if (firstLang) return firstLang

  throw new MetaApiError(
    404,
    132001,
    'OAuthException',
    `Template "${templateName}" has no configured translation`,
  )
}

export function renderTemplateText(
  template: NonNullable<MetaSendMessageRequest['template']>,
  templatesConfig: TemplatesConfigFile,
): string {
  const rawTemplate = resolveTemplateString(
    template.name,
    template.language?.code,
    templatesConfig,
  )

  const namedValues = new Map<string, string>()
  const positionalValues: string[] = []
  const mediaLinks: string[] = []

  const components: MetaTemplateComponent[] = template.components ?? []
  for (const component of components) {
    for (const param of component.parameters ?? []) {
      const val = extractParameterValue(param)
      if (param.type === 'image' || param.type === 'document') {
        if (val) mediaLinks.push(val)
      }
      if (param.parameter_name) {
        namedValues.set(param.parameter_name, val)
      }
      if (component.type === 'body' || component.type === 'header') {
        positionalValues.push(val)
      }
    }
  }

  const DEFAULT_NAMED_FALLBACKS: Record<string, string> = {
    agency_name: 'tu productor asesor de seguros',
  }

  let rendered = rawTemplate.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_match, key: string) => {
    if (namedValues.has(key)) {
      const val = namedValues.get(key) ?? ''
      if (val.trim()) return val
    }
    const index = Number.parseInt(key, 10)
    if (Number.isInteger(index) && index >= 1 && index <= positionalValues.length) {
      return positionalValues[index - 1] ?? ''
    }
    return DEFAULT_NAMED_FALLBACKS[key] ?? ''
  })

  if (mediaLinks.length > 0) {
    rendered = `${rendered}\n${mediaLinks.join('\n')}`.trim()
  }

  return rendered.trim()
}

function formatContactFallbackText(contact: MetaContact): string {
  const name =
    contact.name?.formatted_name ||
    [contact.name?.first_name, contact.name?.last_name].filter(Boolean).join(' ') ||
    'Contacto'
  const phones = (contact.phones ?? []).map((p) => p.phone).filter(Boolean)
  const emails = (contact.emails ?? []).map((e) => e.email).filter(Boolean)

  const lines = [`Contacto: ${name}`]
  if (phones.length > 0) lines.push(`Teléfono: ${phones.join(', ')}`)
  if (emails.length > 0) lines.push(`Email: ${emails.join(', ')}`)
  return lines.join('\n')
}

function formatInteractiveText(interactive: MetaInteractive): string {
  const parts: string[] = []
  if (interactive.header?.text) {
    parts.push(`*${interactive.header.text.trim()}*`)
  }
  if (interactive.body?.text) {
    parts.push(interactive.body.text.trim())
  }

  const buttons = interactive.action?.buttons ?? []
  if (buttons.length > 0) {
    parts.push(
      buttons
        .map((btn, idx) => `${idx + 1}. ${btn.reply?.title || btn.reply?.id || 'Opción'}`)
        .join('\n'),
    )
  }

  const sections = interactive.action?.sections ?? []
  if (sections.length > 0) {
    let counter = 1
    const rowsText: string[] = []
    for (const sec of sections) {
      if (sec.title) rowsText.push(`*${sec.title}*`)
      for (const row of sec.rows ?? []) {
        const desc = row.description ? ` - ${row.description}` : ''
        rowsText.push(`${counter}. ${row.title || row.id || 'Opción'}${desc}`)
        counter++
      }
    }
    if (rowsText.length > 0) parts.push(rowsText.join('\n'))
  }

  const flowCta = interactive.action?.parameters?.flow_cta || interactive.action?.flow_cta
  if (flowCta) {
    parts.push(`[${flowCta}]`)
  }

  if (interactive.footer?.text) {
    parts.push(`_${interactive.footer.text.trim()}_`)
  }

  return parts.filter(Boolean).join('\n\n')
}

export function buildOutboundAction(
  request: MetaSendMessageRequest,
  templatesConfig: TemplatesConfigFile,
): OutboundAction {
  if (!request || typeof request !== 'object') {
    throw new MetaApiError(400, 100, 'OAuthException', 'Invalid JSON body')
  }

  normalizePhoneDigits(request.to)

  if (request.type === 'template') {
    if (!request.template?.name) {
      throw new MetaApiError(400, 100, 'OAuthException', 'Missing template.name')
    }
    const text = renderTemplateText(request.template, templatesConfig)
    if (!text) {
      throw new MetaApiError(400, 100, 'OAuthException', 'Rendered template text is empty')
    }
    return { kind: 'text', text }
  }

  if (request.type === 'text') {
    const body = request.text?.body?.trim()
    if (!body) {
      throw new MetaApiError(400, 100, 'OAuthException', 'Missing text.body')
    }
    return { kind: 'text', text: body }
  }

  if (request.type === 'reaction') {
    if (!request.reaction?.message_id) {
      throw new MetaApiError(400, 100, 'OAuthException', 'Missing reaction.message_id')
    }
    return {
      kind: 'reaction',
      targetMessageId: request.reaction.message_id,
      emoji: request.reaction.emoji ?? '',
    }
  }

  if (request.type === 'contacts') {
    const contact = request.contacts?.[0]
    if (!contact) {
      throw new MetaApiError(400, 100, 'OAuthException', 'Missing contacts[0]')
    }
    return {
      kind: 'contact',
      contact,
      fallbackText: formatContactFallbackText(contact),
    }
  }

  if (request.type === 'interactive') {
    if (!request.interactive) {
      throw new MetaApiError(400, 100, 'OAuthException', 'Missing interactive payload')
    }
    const text = formatInteractiveText(request.interactive)
    if (!text) {
      throw new MetaApiError(400, 100, 'OAuthException', 'Interactive payload produced empty text')
    }
    return { kind: 'text', text }
  }

  throw new MetaApiError(400, 100, 'OAuthException', `Unsupported message type: ${String(request.type)}`)
}
