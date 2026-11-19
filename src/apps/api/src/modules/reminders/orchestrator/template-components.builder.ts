import type { WhatsAppTemplateComponent } from '@copas/contracts'

function parseCivilDateParts(
  dateStr: string | null | undefined,
): { year: string; month: string; day: string } | { raw: string } | null {
  if (!dateStr) return null
  const trimmed = dateStr.trim().split('T')[0]
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return { raw: trimmed }
  const [, year, month, day] = match
  return { year, month, day }
}

/**
 * Formats a civil date string (YYYY-MM-DD) into Argentine/Latin American format DD/MM/YYYY.
 */
export function formatDateCivil(dateStr: string | null | undefined): string {
  const parts = parseCivilDateParts(dateStr)
  if (!parts) return ''
  if ('raw' in parts) return parts.raw
  return `${parts.day}/${parts.month}/${parts.year}`
}

/**
 * Formats a civil date string (YYYY-MM-DD) into short day/month format DD/MM.
 */
export function formatDateDayMonth(dateStr: string | null | undefined): string {
  const parts = parseCivilDateParts(dateStr)
  if (!parts) return ''
  if ('raw' in parts) return parts.raw
  return `${parts.day}/${parts.month}`
}

/**
 * Formats a numeric currency amount with dot thousands separators and comma decimals (e.g. 12.345,67).
 * If amount is null or undefined, defaults to "0,00".
 */
export function formatCurrencyAmount(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) {
    return '0,00'
  }
  const fixed = amount.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withThousandSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withThousandSeparators},${decPart}`
}

export interface BuildTemplateComponentsParams {
  templateName: string
  row: {
    insuredFullName?: string | null
    plateNumber?: string | null
    dueDate?: string | null
    expirationDate?: string | null
    targetDate?: string | null
    totalAmount?: number | null
    [key: string]: unknown
  }
}

interface ReminderTemplateConfig {
  includeAmount: boolean
  dateFormat: 'full' | 'day_month'
}

const REMINDER_TEMPLATE_CONFIGS: Record<string, ReminderTemplateConfig> = {
  recordatorio_vencimiento: {
    includeAmount: true,
    dateFormat: 'full',
  },
  recordatorio_vencimiento_hoy: {
    includeAmount: false,
    dateFormat: 'day_month',
  },
}

function extractCustomerName(row: BuildTemplateComponentsParams['row']): string {
  const rawCustomer =
    typeof row.insuredFullName === 'string' && row.insuredFullName.trim()
      ? row.insuredFullName
      : typeof (row as any).fullName === 'string'
        ? (row as any).fullName
        : ''
  return rawCustomer.trim() || 'Estimado/a cliente'
}

/**
 * Builds the WhatsAppTemplateComponent array matching the template definition.
 */
export function buildReminderTemplateComponents({
  templateName,
  row,
}: BuildTemplateComponentsParams): WhatsAppTemplateComponent[] {
  const config = REMINDER_TEMPLATE_CONFIGS[templateName]
  if (!config) {
    // Fallback for default or custom templates without predefined parameter mapping
    return []
  }

  const rawDate = row.dueDate || row.expirationDate || row.targetDate
  const expirationDate =
    config.dateFormat === 'day_month'
      ? formatDateDayMonth(rawDate)
      : formatDateCivil(rawDate)

  const parameters: WhatsAppTemplateComponent['parameters'] = [
    {
      type: 'text',
      parameter_name: 'customer_name',
      text: extractCustomerName(row),
    },
    {
      type: 'text',
      parameter_name: 'plate_number',
      text: row.plateNumber?.trim() || 'registrada',
    },
    {
      type: 'text',
      parameter_name: 'expiration_date',
      text: expirationDate,
    },
  ]

  if (config.includeAmount) {
    parameters.push({
      type: 'text',
      parameter_name: 'amount',
      text: formatCurrencyAmount(row.totalAmount),
    })
  }

  return [
    {
      type: 'body',
      parameters,
    },
  ]
}
