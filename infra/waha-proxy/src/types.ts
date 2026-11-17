export type MetaTemplateParameter = {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'action'
  text?: string
  parameter_name?: string
  currency?: {
    fallback_value?: string
    code?: string
    amount_1000?: number
  }
  date_time?: {
    fallback_value?: string
  }
  dateTime?: {
    fallback_value?: string
  }
  image?: {
    link?: string
  }
  document?: {
    link?: string
    filename?: string
  }
}

export type MetaTemplateComponent = {
  type: 'header' | 'body' | 'button'
  sub_type?: string
  subType?: string
  index?: number
  parameters?: MetaTemplateParameter[]
}

export type MetaContact = {
  name?: {
    formatted_name?: string
    first_name?: string
    last_name?: string
  }
  phones?: Array<{
    phone: string
    type?: string
  }>
  emails?: Array<{
    email: string
    type?: string
  }>
}

export type MetaInteractive = {
  type?: 'flow' | 'button' | 'list' | string
  header?: {
    type?: string
    text?: string
  }
  body?: {
    text?: string
  }
  footer?: {
    text?: string
  }
  action?: {
    flow_cta?: string
    parameters?: {
      flow_cta?: string
    }
    buttons?: Array<{
      type?: string
      reply?: {
        id?: string
        title?: string
      }
    }>
    sections?: Array<{
      title?: string
      rows?: Array<{
        id?: string
        title?: string
        description?: string
      }>
    }>
  }
}

export type MetaSendMessageRequest = {
  messaging_product?: string
  to: string
  type: 'template' | 'text' | 'reaction' | 'contacts' | 'interactive'
  template?: {
    name: string
    language?: {
      code?: string
    }
    components?: MetaTemplateComponent[]
  }
  text?: {
    preview_url?: boolean
    body: string
  }
  reaction?: {
    message_id: string
    emoji: string
  }
  contacts?: MetaContact[]
  interactive?: MetaInteractive
}

export type SessionMappingEntry = {
  wahaSession: string
  displayPhone?: string
  bearerToken?: string
  agencyName?: string
}

export type SessionsConfigFile = {
  allowDefaultSessionFallback?: boolean
  sessions: Record<string, SessionMappingEntry>
}

export type TemplatesConfigFile = {
  templates: Record<string, Record<string, string>>
}

export type OutboundAction =
  | {
      kind: 'text'
      text: string
    }
  | {
      kind: 'reaction'
      targetMessageId: string
      emoji: string
    }
  | {
      kind: 'contact'
      contact: MetaContact
      fallbackText: string
    }

export type OutboundJobRow = {
  id: string
  wamid: string
  phone_number_id: string
  waha_session: string
  recipient_phone: string
  chat_id: string
  action_type: 'text' | 'reaction' | 'contact'
  payload_json: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  waha_message_id: string | null
  attempts: number
  error_message: string | null
  created_at: number
  updated_at: number
}

export type MessageMappingRow = {
  wamid: string
  waha_message_id: string
  phone_number_id: string
  waha_session: string
  recipient_phone: string
  created_at: number
}

export type ProxyEventLevel = 'debug' | 'info' | 'warning' | 'error'

export type ProxyEventRow = {
  id: string
  timestamp: number
  level: ProxyEventLevel
  category: string
  waha_session: string | null
  wamid: string | null
  job_id: string | null
  event_type: string
  message: string
  details_json: string | null
}

export type ProxyEventRecord = {
  id: string
  timestamp: number
  isoTimestamp: string
  level: ProxyEventLevel
  category: string
  wahaSession: string | null
  wamid: string | null
  jobId: string | null
  eventType: string
  message: string
  details: Record<string, unknown> | null
}

export type QueueStatusCounts = {
  queued: number
  processing: number
  completed: number
  failed: number
  total: number
}

export type QueueStats = {
  totals: QueueStatusCounts
  bySession: Record<string, QueueStatusCounts>
  mappingsCount: number
  eventsCount: number
}

export type WahaWebhookEvent = {
  event: string
  session: string
  engine?: string
  payload?: Record<string, unknown>
}

export type MetaWebhookPayload = {
  object: 'whatsapp_business_account'
  entry: Array<{
    id: string
    changes: Array<{
      field: 'messages'
      value: {
        messaging_product: 'whatsapp'
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<Record<string, unknown>>
        statuses?: Array<Record<string, unknown>>
      }
    }>
  }>
}
