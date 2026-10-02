import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from 'cloudflare:workers'
import type { MessageBatch, ExecutionContext } from '@cloudflare/workers-types'
import type {
  WhatsAppOutboundQueueMessage,
  WhatsAppStatusUpdateQueueMessage,
  ReminderDispatchSummary,
} from '@copas/contracts'
import { RemindersRpcEntrypoint } from './reminders-rpc.entrypoint'
import { queue as whatsappQueueConsumer } from '../../../../whatsapp-service/src/consumer/handler'
import schedulerHandler from '../../../../scheduler/src/index'

// --- Test Types and Environment Helpers ---

type TestEnvironment = typeof env & {
  TEST_MIGRATIONS?: any[]
  PLATFORM_WHATSAPP_ACCESS_TOKEN?: string
  PLATFORM_WHATSAPP_PHONE_NUMBER_ID?: string
  PLATFORM_WHATSAPP_WABA_ID?: string
  WHATSAPP_QUEUE?: any
  WHATSAPP_INBOUND_QUEUE?: any
}

function getTestEnv(overrides: Record<string, unknown> = {}): TestEnvironment {
  return {
    ...env,
    PLATFORM_WHATSAPP_ACCESS_TOKEN: 'EAAB_test_platform_token_integration',
    PLATFORM_WHATSAPP_PHONE_NUMBER_ID: '109876543210123',
    PLATFORM_WHATSAPP_WABA_ID: 'waba_test_456',
    ...overrides,
  } as TestEnvironment
}

// --- Database Seed Helpers ---

interface SeedReminderParams {
  orgId: string
  insuredPhone?: string | null
  installmentDueDate?: string
  installmentAmount?: number
  installmentStatus?: 'pending' | 'paid'
  policyExpirationDate?: string
  hasConsentOptOut?: boolean
  optOutCategory?: 'cat_billing' | 'cat_renewals'
  hasInstallmentRule?: boolean
  hasPolicyRule?: boolean
}

async function seedSharedBaseTables(db: any) {
  // 1. Shared user for uploaded_by references
  await db
    .prepare(
      `INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at, role)
       VALUES ('usr-test-seed', 'Test Admin', 'admin.seed@example.com', 1, unixepoch() * 1000, unixepoch() * 1000, 'admin')`,
    )
    .run()

  // 2. Ensure renewals category exists (cat_billing is already seeded by migration)
  await db
    .prepare(
      `INSERT OR IGNORE INTO communication_categories (id, created_at, updated_at, code, name, isMandatory)
       VALUES ('cat_renewals', unixepoch() * 1000, unixepoch() * 1000, 'renewals', 'Renovaciones', 0)`,
    )
    .run()

  // 3. Shared company
  await db
    .prepare(
      `INSERT OR IGNORE INTO companies (id, created_at, updated_at, code, name)
       VALUES ('comp-test', unixepoch() * 1000, unixepoch() * 1000, 'SANCOR', 'Sancor Seguros')`,
    )
    .run()

  // 4. Shared branch and asset type
  await db
    .prepare(
      `INSERT OR IGNORE INTO branches (id, created_at, updated_at, code, name)
       VALUES ('branch-auto', unixepoch() * 1000, unixepoch() * 1000, 'AUTO', 'Automotores')`,
    )
    .run()

  await db
    .prepare(
      `INSERT OR IGNORE INTO asset_types (id, created_at, updated_at, branchId, code, name, propertyDefinition)
       VALUES ('atype-auto', unixepoch() * 1000, unixepoch() * 1000, 'branch-auto', 'VEHICLE', 'Vehículo', '{"type":"object"}')`,
    )
    .run()
}

async function seedReminderData(db: any, params: SeedReminderParams) {
  await seedSharedBaseTables(db)

  const {
    orgId,
    insuredPhone = '+5491155556666',
    installmentDueDate = '2026-09-20',
    installmentAmount = 18500,
    installmentStatus = 'pending',
    policyExpirationDate = '2026-09-20',
    hasConsentOptOut = false,
    optOutCategory = 'cat_billing',
    hasInstallmentRule = true,
    hasPolicyRule = false,
  } = params

  const insuredId = `ins-${orgId}`
  const assetId = `asset-${orgId}`
  const policyInstallmentId = `pol-inst-${orgId}`
  const installmentId = `inst-${orgId}`
  const policyExpirationId = `pol-exp-${orgId}`

  // 1. Organization
  await db
    .prepare(
      `INSERT INTO organization (id, name, slug, created_at)
       VALUES (?, ?, ?, unixepoch() * 1000)`,
    )
    .bind(orgId, `Org ${orgId}`, `slug-${orgId}`)
    .run()

  // 1b. Channel Endpoints & Organization Channel
  await db
    .prepare(
      `INSERT OR IGNORE INTO channel_endpoints (id, created_at, updated_at, channelId, number, provider, ownerKind, ownerOrganizationId, status)
       VALUES (?, unixepoch() * 1000, unixepoch() * 1000, 'chn_whatsapp', '+5491122223333', 'whatsapp_cloud', 'organization', ?, 'active')`,
    )
    .bind(`cep-${orgId}`, orgId)
    .run()

  await db
    .prepare(
      `INSERT OR IGNORE INTO organization_channels (id, created_at, updated_at, organizationId, channelId, isEnabled)
       VALUES (?, unixepoch() * 1000, unixepoch() * 1000, ?, 'chn_whatsapp', 1)`,
    )
    .bind(`och-${orgId}`, orgId)
    .run()

  await db
    .prepare(
      `INSERT OR IGNORE INTO organization_channel_endpoints (id, created_at, updated_at, organizationChannelId, endpointId, isPrimary, status)
       VALUES (?, unixepoch() * 1000, unixepoch() * 1000, ?, ?, 1, 'active')`,
    )
    .bind(`ocep-${orgId}`, `och-${orgId}`, `cep-${orgId}`)
    .run()

  // 2. Insured
  await db
    .prepare(
      `INSERT INTO insureds (id, created_at, updated_at, organizationId, uploaded_by, cuit, fullName, phone, email)
       VALUES (?, unixepoch() * 1000, unixepoch() * 1000, ?, 'usr-test-seed', '20304050607', 'Carlos Fernandez', ?, 'carlos@example.com')`,
    )
    .bind(insuredId, orgId, insuredPhone)
    .run()

  // 3. Asset (Vehicle with plate)
  await db
    .prepare(
      `INSERT INTO assets (id, created_at, updated_at, insuredId, assetTypeId, uploaded_by, properties)
       VALUES (?, unixepoch() * 1000, unixepoch() * 1000, ?, 'atype-auto', 'usr-test-seed', ?)`,
    )
    .bind(assetId, insuredId, JSON.stringify({ patente: 'AF123CD' }))
    .run()

  // 4. Installment Policy & Installment (if installment rule or requested)
  if (hasInstallmentRule || installmentStatus) {
    await db
      .prepare(
        `INSERT INTO policies (id, created_at, updated_at, organizationId, companyId, insuredId, uploaded_by, policyNumber, status, startDate, endDate, effectiveEndDate, currency)
         VALUES (?, unixepoch() * 1000, unixepoch() * 1000, ?, 'comp-test', ?, 'usr-test-seed', 'POL-INST-001', 'active', '2026-08-01', '2026-12-31', '2026-12-31', 'ARS')`,
      )
      .bind(policyInstallmentId, orgId, insuredId)
      .run()

    await db
      .prepare(
        `INSERT INTO policy_assets (policyId, assetId, created_at, updated_at)
         VALUES (?, ?, unixepoch() * 1000, unixepoch() * 1000)`,
      )
      .bind(policyInstallmentId, assetId)
      .run()

    await db
      .prepare(
        `INSERT INTO policy_installments (id, created_at, updated_at, organizationId, policyId, uploaded_by, installmentNumber, dueDate, totalAmount, currency, status)
         VALUES (?, unixepoch() * 1000, unixepoch() * 1000, ?, ?, 'usr-test-seed', 1, ?, ?, 'ARS', ?)`,
      )
      .bind(installmentId, orgId, policyInstallmentId, installmentDueDate, installmentAmount, installmentStatus)
      .run()
  }

  // 5. Expiring Policy (if policy rule)
  if (hasPolicyRule) {
    await db
      .prepare(
        `INSERT INTO policies (id, created_at, updated_at, organizationId, companyId, insuredId, uploaded_by, policyNumber, status, startDate, endDate, effectiveEndDate, currency)
         VALUES (?, unixepoch() * 1000, unixepoch() * 1000, ?, 'comp-test', ?, 'usr-test-seed', 'POL-EXP-002', 'active', '2025-09-20', ?, ?, 'ARS')`,
      )
      .bind(policyExpirationId, orgId, insuredId, policyExpirationDate, policyExpirationDate)
      .run()

    await db
      .prepare(
        `INSERT INTO policy_assets (policyId, assetId, created_at, updated_at)
         VALUES (?, ?, unixepoch() * 1000, unixepoch() * 1000)`,
      )
      .bind(policyExpirationId, assetId)
      .run()
  }

  // 6. Reminder Rules (offsetDays = -3, meaning targetDate = scheduledDate - (-3) = scheduledDate + 3)
  if (hasInstallmentRule) {
    await db
      .prepare(
        `INSERT INTO reminder_rules (id, created_at, updated_at, organizationId, eventSource, offsetDays, templateId, isEnabled)
         VALUES (?, unixepoch() * 1000, unixepoch() * 1000, ?, 'installment_due', -3, 'tpl_recordatorio_vencimiento', 1)`,
      )
      .bind(`rule-inst-${orgId}`, orgId)
      .run()
  }

  if (hasPolicyRule) {
    await db
      .prepare(
        `INSERT INTO reminder_rules (id, created_at, updated_at, organizationId, eventSource, offsetDays, templateId, isEnabled)
         VALUES (?, unixepoch() * 1000, unixepoch() * 1000, ?, 'policy_expiration', -3, 'tpl_recordatorio_vencimiento', 1)`,
      )
      .bind(`rule-pol-${orgId}`, orgId)
      .run()
  }

  // 7. Communication Consent Opt-out
  if (hasConsentOptOut) {
    await db
      .prepare(
        `INSERT INTO communication_consents (organizationId, insuredId, categoryId, isOptedOut, optOutReason, created_at, updated_at)
         VALUES (?, ?, ?, 1, 'Insured opted out of reminders', unixepoch() * 1000, unixepoch() * 1000)`,
      )
      .bind(orgId, insuredId, optOutCategory)
      .run()
  }

  return {
    orgId,
    insuredId,
    assetId,
    policyInstallmentId,
    installmentId,
    policyExpirationId,
  }
}

describe('Reminders End-to-End Integration Flow', () => {
  let testEnv: TestEnvironment
  let enqueuedWhatsAppMessages: WhatsAppOutboundQueueMessage[]
  let metaGraphApiRequests: Array<{ url: string; headers: Headers; body: any }>
  let inboundQueueMessages: WhatsAppStatusUpdateQueueMessage[]
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    enqueuedWhatsAppMessages = []
    metaGraphApiRequests = []
    inboundQueueMessages = []

    testEnv = getTestEnv({
      WHATSAPP_QUEUE: {
        send: vi.fn(async (msg: WhatsAppOutboundQueueMessage) => {
          enqueuedWhatsAppMessages.push(msg)
        }),
      },
      WHATSAPP_INBOUND_QUEUE: {
        send: vi.fn(async (msg: WhatsAppStatusUpdateQueueMessage) => {
          inboundQueueMessages.push(msg)
        }),
      },
    })

    // Clean up dynamic test tables for complete test isolation (child tables first)
    await testEnv.DB.prepare('DELETE FROM message_statuses').run()
    await testEnv.DB.prepare('DELETE FROM messages').run()
    await testEnv.DB.prepare('DELETE FROM conversation_entities').run()
    await testEnv.DB.prepare('DELETE FROM conversations').run()
    await testEnv.DB.prepare('DELETE FROM organization_channel_endpoints').run()
    await testEnv.DB.prepare('DELETE FROM organization_channels').run()
    await testEnv.DB.prepare('DELETE FROM channel_endpoints').run()
    await testEnv.DB.prepare('DELETE FROM reminder_rules').run()
    await testEnv.DB.prepare('DELETE FROM policy_installments').run()
    await testEnv.DB.prepare('DELETE FROM policy_assets').run()
    await testEnv.DB.prepare('DELETE FROM policies').run()
    await testEnv.DB.prepare('DELETE FROM assets').run()
    await testEnv.DB.prepare('DELETE FROM insureds').run()
    await testEnv.DB.prepare('DELETE FROM communication_consents').run()
    await testEnv.DB.prepare('DELETE FROM organization').run()

    // Mock global fetch to intercept Meta Cloud Graph API calls
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url
      const headers = new Headers(init?.headers)
      const body = init?.body ? JSON.parse(init.body) : {}

      if (url.includes('graph.facebook.com')) {
        metaGraphApiRequests.push({ url, headers, body })
        return new Response(
          JSON.stringify({
            messaging_product: 'whatsapp',
            contacts: [{ input: body.to, wa_id: body.to?.replace('+', '') }],
            messages: [{ id: `wamid.mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response('Not Found', { status: 404 })
    })
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
  })

  it('delivers installment due reminder from D1 extraction through queue to Meta Graph API mock', async () => {
    const orgId = `org-inst-${Date.now()}`
    const seed = await seedReminderData(testEnv.DB, {
      orgId,
      insuredPhone: '+5491155556666',
      installmentDueDate: '2026-09-20',
      installmentAmount: 18500,
      installmentStatus: 'pending',
      hasInstallmentRule: true,
      hasPolicyRule: false,
    })

    // 1. Trigger Dispatch for 2026-09-17 (offsetDays = -3 targets dueDate 2026-09-20)
    const entrypoint = new RemindersRpcEntrypoint({} as any, testEnv)
    const summary: ReminderDispatchSummary = await entrypoint.dispatchDueReminders({
      scheduledDate: '2026-09-17',
    })

    expect(summary.scheduledDate).toBe('2026-09-17')
    expect(summary.totalEvaluated).toBeGreaterThanOrEqual(1)
    expect(summary.totalEnqueued).toBeGreaterThanOrEqual(1)
    expect(summary.totalSkipped).toBe(0)

    // 2. Validate D1 Database State
    const conversationsRes = await testEnv.DB
      .prepare('SELECT * FROM conversations WHERE organizationId = ?')
      .bind(orgId)
      .all()
    expect(conversationsRes.results?.length).toBe(1)
    const conversation = conversationsRes.results![0] as any
    expect(conversation.type).toBe('reminder')
    expect(conversation.insuredId).toBe(seed.insuredId)

    const linksRes = await testEnv.DB
      .prepare('SELECT * FROM conversation_entities WHERE conversationId = ?')
      .bind(conversation.id)
      .all()
    expect(linksRes.results?.length).toBeGreaterThanOrEqual(1)
    const linkedPolicy = linksRes.results?.find((r: any) => r.policyId === seed.policyInstallmentId)
    const linkedInstallment = linksRes.results?.find((r: any) => r.installmentId === seed.installmentId)
    expect(linkedPolicy).toBeDefined()
    expect(linkedInstallment).toBeDefined()

    const messagesRes = await testEnv.DB
      .prepare('SELECT * FROM messages WHERE organizationId = ? AND conversationId = ?')
      .bind(orgId, conversation.id)
      .all()
    expect(messagesRes.results?.length).toBe(1)
    const message = messagesRes.results![0] as any
    const statusRes = await testEnv.DB
      .prepare('SELECT * FROM message_statuses WHERE messageId = ?')
      .bind(message.id)
      .all()
    expect(statusRes.results?.length).toBe(1)
    expect((statusRes.results![0] as any).status).toBe('sent')
    expect(message.deduplicationHash).toBeDefined()
    expect(message.deduplicationHash.length).toBe(64) // SHA-256 hex string

    // 3. Validate Cloudflare Queue Message Envelope
    expect(enqueuedWhatsAppMessages.length).toBe(1)
    const queueMsg = enqueuedWhatsAppMessages[0]
    expect(queueMsg.type).toBe('whatsapp-outbound')
    expect(queueMsg.payload.organizationId).toBe(orgId)
    expect(queueMsg.payload.to).toBe('+5491155556666')
    expect(queueMsg.payload.mode).toBe('template')
    expect(queueMsg.payload.template.name).toBe('recordatorio_vencimiento')
    expect(queueMsg.payload.template.language.code).toBe('es_AR')

    // 4. Run WhatsApp Service Consumer with the enqueued message batch
    const ackFn = vi.fn()
    const retryFn = vi.fn()
    const batch: MessageBatch<WhatsAppOutboundQueueMessage> = {
      queue: 'copas-whatsapp',
      messages: [
        {
          id: 'queue-msg-1',
          timestamp: new Date(),
          body: queueMsg,
          attempts: 1,
          ack: ackFn,
          retry: retryFn,
        },
      ],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    }

    const whatsappEnv = {
      ...testEnv,
      META_GRAPH_API_BASE_URL: 'https://graph.facebook.com',
      META_GRAPH_API_VERSION: 'v20.0',
      PLATFORM_WHATSAPP_ACCESS_TOKEN: 'EAAB_test_platform_token_integration',
    }

    await whatsappQueueConsumer(batch, whatsappEnv as any, {} as ExecutionContext)

    // 5. Validate Meta Graph API Mock Request & Message Acknowledgment
    expect(ackFn).toHaveBeenCalled()
    expect(retryFn).not.toHaveBeenCalled()
    expect(metaGraphApiRequests.length).toBe(1)

    const metaReq = metaGraphApiRequests[0]
    expect(metaReq.url).toBe('https://graph.facebook.com/v20.0/109876543210123/messages')
    expect(metaReq.headers.get('Authorization')).toBe('Bearer EAAB_test_platform_token_integration')
    expect(metaReq.headers.get('Content-Type')).toBe('application/json')
    expect(metaReq.body.messaging_product).toBe('whatsapp')
    expect(metaReq.body.to).toBe('+5491155556666')
    expect(metaReq.body.type).toBe('template')
    expect(metaReq.body.template.name).toBe('recordatorio_vencimiento')

    // Check template parameters formatted by template-components.builder
    const bodyComp = metaReq.body.template.components.find((c: any) => c.type === 'body')
    expect(bodyComp).toBeDefined()
    expect(bodyComp.parameters).toEqual([
      { type: 'text', parameter_name: 'customer_name', text: 'Carlos Fernandez' },
      { type: 'text', parameter_name: 'plate_number', text: 'AF123CD' },
      { type: 'text', parameter_name: 'expiration_date', text: '20/09/2026' },
      { type: 'text', parameter_name: 'amount', text: '18.500,00' },
    ])
  })

  it('delivers policy expiration renewal reminder to Meta Graph API mock', async () => {
    const orgId = `org-exp-${Date.now()}`
    await seedReminderData(testEnv.DB, {
      orgId,
      insuredPhone: '+5491177778888',
      policyExpirationDate: '2026-09-20',
      hasInstallmentRule: false,
      hasPolicyRule: true,
    })

    const entrypoint = new RemindersRpcEntrypoint({} as any, testEnv)
    const summary = await entrypoint.dispatchDueReminders({
      scheduledDate: '2026-09-17',
    })

    expect(summary.totalEvaluated).toBeGreaterThanOrEqual(1)
    expect(summary.totalEnqueued).toBeGreaterThanOrEqual(1)
    expect(enqueuedWhatsAppMessages.length).toBe(1)

    const queueMsg = enqueuedWhatsAppMessages[0]
    expect(queueMsg.payload.to).toBe('+5491177778888')
    expect(queueMsg.payload.template.name).toBe('recordatorio_vencimiento')

    const ackFn = vi.fn()
    await whatsappQueueConsumer(
      {
        queue: 'copas-whatsapp',
        messages: [{ id: 'msg-exp', timestamp: new Date(), body: queueMsg, attempts: 1, ack: ackFn, retry: vi.fn() }],
        ackAll: vi.fn(),
        retryAll: vi.fn(),
      },
      testEnv as any,
      {} as ExecutionContext,
    )

    expect(ackFn).toHaveBeenCalled()
    expect(metaGraphApiRequests.length).toBe(1)
    expect(metaGraphApiRequests[0].body.to).toBe('+5491177778888')
  })

  it('enforces idempotency and skips duplicate dispatch on the same scheduled date', async () => {
    const orgId = `org-idemp-${Date.now()}`
    await seedReminderData(testEnv.DB, {
      orgId,
      insuredPhone: '+5491133334444',
      installmentDueDate: '2026-09-20',
      hasInstallmentRule: true,
      hasPolicyRule: false,
    })

    const entrypoint = new RemindersRpcEntrypoint({} as any, testEnv)

    // First execution: should evaluate and enqueue
    const firstSummary = await entrypoint.dispatchDueReminders({ scheduledDate: '2026-09-17' })
    expect(firstSummary.totalEnqueued).toBe(1)
    expect(firstSummary.totalAlreadySent).toBe(0)
    expect(enqueuedWhatsAppMessages.length).toBe(1)

    // Second execution on same date: must be detected as already sent via deduplicationHash
    const secondSummary = await entrypoint.dispatchDueReminders({ scheduledDate: '2026-09-17' })
    expect(secondSummary.totalAlreadySent).toBe(1)
    expect(secondSummary.totalEnqueued).toBe(0)

    // Queue must NOT receive duplicate messages and Meta API must NOT be called again
    expect(enqueuedWhatsAppMessages.length).toBe(1)
  })

  it('skips dispatch when insured has opted out in communication consents', async () => {
    const orgId = `org-optout-${Date.now()}`
    await seedReminderData(testEnv.DB, {
      orgId,
      insuredPhone: '+5491199990000',
      installmentDueDate: '2026-09-20',
      hasInstallmentRule: true,
      hasConsentOptOut: true,
      optOutCategory: 'cat_billing',
    })

    const entrypoint = new RemindersRpcEntrypoint({} as any, testEnv)
    const summary = await entrypoint.dispatchDueReminders({ scheduledDate: '2026-09-17' })

    expect(summary.totalSkipped).toBe(1)
    expect(summary.totalEnqueued).toBe(0)
    expect(enqueuedWhatsAppMessages.length).toBe(0)

    // Verify message record in DB has status 'skipped' and skipReason 'opt_out'
    const messagesRes = await testEnv.DB
      .prepare('SELECT * FROM messages WHERE organizationId = ?')
      .bind(orgId)
      .all()
    expect(messagesRes.results?.length).toBe(1)
    const msg = messagesRes.results![0] as any

    const statusRes = await testEnv.DB
      .prepare('SELECT * FROM message_statuses WHERE messageId = ?')
      .bind(msg.id)
      .all()
    expect(statusRes.results?.length).toBe(1)
    const details = JSON.parse(statusRes.results![0].details || '{}')
    expect(details.reason).toBe('opt_out')
  })

  it('skips dispatch when insured has no phone number registered', async () => {
    const orgId = `org-nophone-${Date.now()}`
    await seedReminderData(testEnv.DB, {
      orgId,
      insuredPhone: null,
      installmentDueDate: '2026-09-20',
      hasInstallmentRule: true,
    })

    const entrypoint = new RemindersRpcEntrypoint({} as any, testEnv)
    const summary = await entrypoint.dispatchDueReminders({ scheduledDate: '2026-09-17' })

    expect(summary.totalSkipped).toBe(1)
    expect(summary.totalEnqueued).toBe(0)
    expect(enqueuedWhatsAppMessages.length).toBe(0)

    const messagesRes = await testEnv.DB
      .prepare('SELECT * FROM messages WHERE organizationId = ?')
      .bind(orgId)
      .all()
    expect(messagesRes.results?.length).toBe(1)
    const msg = messagesRes.results![0] as any

    const statusRes = await testEnv.DB
      .prepare('SELECT * FROM message_statuses WHERE messageId = ?')
      .bind(msg.id)
      .all()
    const details = JSON.parse(statusRes.results![0].details || '{}')
    expect(details.reason).toBe('missing_phone')
  })

  it('ignores paid installments and does not produce reminders', async () => {
    const orgId = `org-paid-${Date.now()}`
    await seedReminderData(testEnv.DB, {
      orgId,
      installmentDueDate: '2026-09-20',
      installmentStatus: 'paid',
      hasInstallmentRule: true,
    })

    const entrypoint = new RemindersRpcEntrypoint({} as any, testEnv)
    const summary = await entrypoint.dispatchDueReminders({ scheduledDate: '2026-09-17' })

    expect(summary.totalEnqueued).toBe(0)
    expect(summary.totalEvaluated).toBe(0)
    expect(enqueuedWhatsAppMessages.length).toBe(0)
  })

  it('handles Meta Graph API non-recoverable error (4xx) by notifying inbound queue and acking message', async () => {
    // Force Meta Graph API to return HTTP 400 (e.g. invalid template or policy rejection)
    fetchSpy.mockImplementationOnce(async () => {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Template name does not exist in the translation',
            type: 'OAuthException',
            code: 132001,
            error_data: { messaging_product: 'whatsapp' },
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    })

    const queueMsg: WhatsAppOutboundQueueMessage = {
      type: 'whatsapp-outbound',
      metadata: { organizationId: 'org-err', idempotencyKey: 'idemp-err' },
      payload: {
        messageId: 'msg-err-1',
        conversationId: 'conv-err-1',
        organizationId: 'org-err',
        organizationChannelEndpointId: 'platform',
        phoneNumberId: 'phone-123',
        to: '+5491100001111',
        mode: 'template',
        template: {
          name: 'non_existent_template',
          language: { code: 'es_AR' },
          components: [],
        },
      },
    }

    const ackFn = vi.fn()
    const retryFn = vi.fn()

    await whatsappQueueConsumer(
      {
        queue: 'copas-whatsapp',
        messages: [{ id: 'q-err-1', timestamp: new Date(), body: queueMsg, attempts: 1, ack: ackFn, retry: retryFn }],
        ackAll: vi.fn(),
        retryAll: vi.fn(),
      },
      testEnv as any,
      {} as ExecutionContext,
    )

    // Message must be acknowledged to avoid infinite poison retry loops
    expect(ackFn).toHaveBeenCalled()
    expect(retryFn).not.toHaveBeenCalled()

    // Inbound queue must receive status update 'failed'
    expect(inboundQueueMessages.length).toBe(1)
    expect(inboundQueueMessages[0].type).toBe('whatsapp-status-update')
    expect(inboundQueueMessages[0].payload.status).toBe('failed')
    expect(inboundQueueMessages[0].payload.errors?.[0]?.code).toBe(132001)
  })

  it('handles Meta Graph API transient error (5xx / 429) by scheduling queue retry', async () => {
    // Force Meta Graph API to return HTTP 500
    fetchSpy.mockImplementationOnce(async () => {
      return new Response('Internal Server Error', { status: 500 })
    })

    const queueMsg: WhatsAppOutboundQueueMessage = {
      type: 'whatsapp-outbound',
      metadata: { organizationId: 'org-500', idempotencyKey: 'idemp-500' },
      payload: {
        messageId: 'msg-500',
        conversationId: 'conv-500',
        organizationId: 'org-500',
        organizationChannelEndpointId: 'platform',
        phoneNumberId: 'phone-123',
        to: '+5491100001111',
        mode: 'template',
        template: {
          name: 'recordatorio_vencimiento',
          language: { code: 'es_AR' },
          components: [],
        },
      },
    }

    const ackFn = vi.fn()
    const retryFn = vi.fn()

    await whatsappQueueConsumer(
      {
        queue: 'copas-whatsapp',
        messages: [{ id: 'q-500-1', timestamp: new Date(), body: queueMsg, attempts: 1, ack: ackFn, retry: retryFn }],
        ackAll: vi.fn(),
        retryAll: vi.fn(),
      },
      testEnv as any,
      {} as ExecutionContext,
    )

    expect(retryFn).toHaveBeenCalled()
    expect(ackFn).not.toHaveBeenCalled()
  })

  it('triggers reminder dispatch seamlessly via Scheduler worker HTTP trigger', async () => {
    const orgId = `org-sched-${Date.now()}`
    await seedReminderData(testEnv.DB, {
      orgId,
      insuredPhone: '+5491188889999',
      installmentDueDate: '2026-09-20',
      hasInstallmentRule: true,
    })

    const entrypoint = new RemindersRpcEntrypoint({} as any, testEnv)

    // Scheduler worker env with API binding pointing to RemindersRpcEntrypoint
    const schedulerEnv = {
      API: {
        dispatchDueReminders: (params: { scheduledDate: string }) =>
          entrypoint.dispatchDueReminders(params),
      },
    }

    const triggerReq = new Request('http://scheduler.internal/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-09-17' }),
    })

    const res = await schedulerHandler.fetch(triggerReq, schedulerEnv as any)
    expect(res.status).toBe(200)

    const data = (await res.json()) as ReminderDispatchSummary
    expect(data.scheduledDate).toBe('2026-09-17')
    expect(data.totalEnqueued).toBe(1)
    expect(enqueuedWhatsAppMessages.length).toBe(1)
    expect(enqueuedWhatsAppMessages[0].payload.to).toBe('+5491188889999')
  })
})
