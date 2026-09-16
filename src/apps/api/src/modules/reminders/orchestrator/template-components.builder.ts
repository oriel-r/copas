import type { WhatsAppTemplateComponent } from '@copas/contracts'

/**
 * Formats a civil date string (YYYY-MM-DD) into Argentine/Latin American format DD/MM/YYYY.
 */
export function formatDateCivil(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim().split('T')[0]
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return trimmed
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
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

/**
 * Builds the WhatsAppTemplateComponent array matching the template definition.
 */
export function buildReminderTemplateComponents({
  templateName,
  row,
}: BuildTemplateComponentsParams): WhatsAppTemplateComponent[] {
  if (templateName === 'recordatorio_vencimiento') {
    const customerName = row.insuredFullName?.trim() || 'Estimado/a cliente'
    const plateNumber = row.plateNumber?.trim() || 'registrada'
    const expirationDate = formatDateCivil(row.dueDate || row.expirationDate || row.targetDate)
    const amount = formatCurrencyAmount(row.totalAmount)

    return [
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            parameter_name: 'customer_name',
            text: customerName,
          },
          {
            type: 'text',
            parameter_name: 'plate_number',
            text: plateNumber,
          },
          {
            type: 'text',
            parameter_name: 'expiration_date',
            text: expirationDate,
          },
          {
            type: 'text',
            parameter_name: 'amount',
            text: amount,
          },
        ],
      },
    ]
  }

  // Fallback for default or custom templates without predefined parameter mapping
  return []
}
