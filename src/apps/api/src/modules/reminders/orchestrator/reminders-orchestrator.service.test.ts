import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRemindersOrchestratorService } from './reminders-orchestrator.service'
import type { ReminderDispatchSummary, RemindersDueResponse } from '@copas/contracts'

describe('reminders-orchestrator.service', () => {
  let mockDb: any
  let mockReminderRulesService: any
  let mockConversationsService: any
  let mockMessagesService: any
  let mockChannelEndpointsService: any
  let mockWhatsappDispatchService: any
  let service: ReturnType<typeof createRemindersOrchestratorService>

  const testOrgId = '018f9e2b-0000-7000-8000-000000000001'
  const testRuleId = '018f9e2b-1111-7000-8000-000000000001'
  const testPolicyId = '018f9e2b-2222-7000-8000-000000000002'
  const testInstallmentId = '018f9e2b-3333-7000-8000-000000000003'
  const testInsuredId = '018f9e2b-4444-7000-8000-000000000004'

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    }

    mockReminderRulesService = {
      getActiveRules: vi.fn(),
      listRules: vi.fn(),
    }

    mockConversationsService = {
      getOrCreateActiveConversation: vi.fn(),
      linkEntityToConversation: vi.fn(),
    }

    mockMessagesService = {
      isAlreadySent: vi.fn(),
      recordOutboundMessage: vi.fn(),
    }

    mockChannelEndpointsService = {
      resolveWhatsAppEndpointAndCredentials: vi.fn(),
    }

    mockWhatsappDispatchService = {
      enqueueTemplateReminder: vi.fn(),
    }

    service = createRemindersOrchestratorService({
      db: mockDb,
      reminderRulesService: mockReminderRulesService,
      conversationsService: mockConversationsService,
      messagesService: mockMessagesService,
      channelEndpointsService: mockChannelEndpointsService,
      whatsappDispatchService: mockWhatsappDispatchService,
    } as any)
  })

  describe('constructor and dependency resolution', () => {
    it('should instantiate service with positional arguments and communicationsModule fallback', async () => {
      const mockComms = {
        channelEndpoints: mockChannelEndpointsService,
        consents: { isInsuredOptedOut: vi.fn().mockResolvedValue(false) },
        messages: mockMessagesService,
        conversations: mockConversationsService,
        whatsappDispatch: mockWhatsappDispatchService,
      }

      const positionalService = createRemindersOrchestratorService(
        mockDb,
        testOrgId,
        mockReminderRulesService,
        undefined,
        mockComms as any,
      )

      expect(positionalService).toBeDefined()
      expect(typeof positionalService.getDueRemindersPreview).toBe('function')
      expect(typeof positionalService.dispatchDueRemindersForOrg).toBe('function')

      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([])
      const preview = await positionalService.getDueRemindersPreview({ organizationId: testOrgId } as any)
      expect(preview.items).toEqual([])
    })

    it('should resolve dependencies from communicationsModule with *Service naming', async () => {
      const mockComms = {
        channelEndpointsService: mockChannelEndpointsService,
        consentsService: { isInsuredOptedOut: vi.fn().mockResolvedValue(false) },
        messagesService: mockMessagesService,
        conversationsService: mockConversationsService,
        whatsappDispatchService: mockWhatsappDispatchService,
      }

      const commsService = createRemindersOrchestratorService({
        db: mockDb,
        organizationId: testOrgId,
        reminderRulesService: mockReminderRulesService,
        communicationsModule: mockComms,
      } as any)

      expect(commsService).toBeDefined()
    })

    it('should support d1 property fallback when db is not provided in options', async () => {
      const mockStatement: any = {
        all: vi.fn().mockResolvedValue({ results: [] }),
        raw: vi.fn().mockResolvedValue([]),
      }
      mockStatement.bind = vi.fn().mockReturnValue(mockStatement)

      const d1Client = {
        prepare: vi.fn().mockReturnValue(mockStatement),
      }

      const d1Service = createRemindersOrchestratorService({
        d1: d1Client,
        organizationId: testOrgId,
        reminderRulesService: mockReminderRulesService,
        messagesService: mockMessagesService,
        conversationsService: mockConversationsService,
        channelEndpointsService: mockChannelEndpointsService,
        whatsappDispatchService: mockWhatsappDispatchService,
      } as any)

      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([
        {
          id: testRuleId,
          organizationId: testOrgId,
          eventSource: 'installment_due' as const,
          offsetDays: 0,
        },
      ])

      const preview = await d1Service.getDueRemindersPreview({ organizationId: testOrgId, date: '2026-09-10' } as any)
      expect(preview).toBeDefined()
      expect(d1Client.prepare).toHaveBeenCalled()
    })
  })

  describe('getDueRemindersPreview', () => {
    it('should return empty items and totalDue 0 when activeRules is empty', async () => {
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([])

      const result = await service.getDueRemindersPreview({
        organizationId: testOrgId,
        date: '2026-09-10',
      } as any)

      expect(result).toEqual({
        date: '2026-09-10',
        totalDue: 0,
        items: [],
      })
    })

    it('should default to today date when date parameter is omitted in query', async () => {
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([])

      const todayStr = new Date().toISOString().split('T')[0]
      const result = await service.getDueRemindersPreview({
        organizationId: testOrgId,
      } as any)

      expect(result.date).toBe(todayStr)
      expect(result.totalDue).toBe(0)
    })

    it('should correctly calculate target dates for positive, negative, and zero rule offsets', async () => {
      const scheduledDate = '2026-09-10'
      const rules = [
        {
          id: 'rule-pos',
          organizationId: testOrgId,
          eventSource: 'installment_due' as const,
          offsetDays: 5, // 2026-09-10 - 5 = 2026-09-05
        },
        {
          id: 'rule-zero',
          organizationId: testOrgId,
          eventSource: 'installment_due' as const,
          offsetDays: 0, // 2026-09-10 - 0 = 2026-09-10
        },
        {
          id: 'rule-neg',
          organizationId: testOrgId,
          eventSource: 'installment_due' as const,
          offsetDays: -4, // 2026-09-10 - (-4) = 2026-09-14
        },
      ]
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce(rules)

      mockDb.where
        .mockResolvedValueOnce([{ id: 'inst-1', insuredPhone: '+549111', installmentNumber: 1, dueDate: '2026-09-05' }])
        .mockResolvedValueOnce([{ id: 'inst-2', insuredPhone: '+549112', installmentNumber: 2, dueDate: '2026-09-10' }])
        .mockResolvedValueOnce([{ id: 'inst-3', insuredPhone: '+549113', installmentNumber: 3, dueDate: '2026-09-14' }])

      const result = await service.getDueRemindersPreview({
        organizationId: testOrgId,
        date: scheduledDate,
      } as any)

      expect(result.items.length).toBe(3)
      expect(result.items[0].targetDate).toBe('2026-09-05')
      expect(result.items[1].targetDate).toBe('2026-09-10')
      expect(result.items[2].targetDate).toBe('2026-09-14')
    })

    it('should query D1 database via prepare and bind when client does not implement select', async () => {
      const mockStatement: any = {
        all: vi.fn().mockResolvedValue({ results: [] }),
        raw: vi.fn().mockResolvedValue([
          ['d1-policy-1', testOrgId, 'POL-D1', 'SANCOR', '2026-09-15', 'active', 'ins-d1', 'MARIA', '+549115555', 50000, 'ARS']
        ]),
      }
      mockStatement.bind = vi.fn().mockReturnValue(mockStatement)

      const mockD1Client = {
        prepare: vi.fn().mockReturnValue(mockStatement),
      }

      const d1Orchestrator = createRemindersOrchestratorService({
        db: mockD1Client,
        organizationId: testOrgId,
        reminderRulesService: mockReminderRulesService,
      } as any)

      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([
        {
          id: 'rule-exp',
          organizationId: testOrgId,
          eventSource: 'policy_expiration' as const,
          offsetDays: -5,
        },
      ])

      const result = await d1Orchestrator.getDueRemindersPreview({
        organizationId: testOrgId,
        date: '2026-09-10',
      } as any)

      expect(mockD1Client.prepare).toHaveBeenCalledWith(
        expect.stringContaining('v_expiring_policies'),
      )
      expect(result.items.length).toBe(1)
      expect(result.items[0].targetDate).toBe('2026-09-15')
    })

    it('should evaluate consent with consentsService in getDueRemindersPreview', async () => {
      const mockConsentsService = {
        isInsuredOptedOut: vi.fn().mockResolvedValueOnce(true), // opted out
      }

      const serviceWithConsent = createRemindersOrchestratorService({
        db: mockDb,
        organizationId: testOrgId,
        reminderRulesService: mockReminderRulesService,
        consentsService: mockConsentsService,
      } as any)

      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([
        {
          id: testRuleId,
          organizationId: testOrgId,
          eventSource: 'installment_due' as const,
          offsetDays: 0,
        },
      ])

      mockDb.where.mockResolvedValueOnce([
        {
          id: 'inst-opted-out',
          insuredId: 'ins-opted-out',
          insuredPhone: '+549119999',
          installmentNumber: 1,
          dueDate: '2026-09-10',
        },
      ])

      const result = await serviceWithConsent.getDueRemindersPreview({
        organizationId: testOrgId,
        date: '2026-09-10',
      } as any)

      expect(mockConsentsService.isInsuredOptedOut).toHaveBeenCalledWith('ins-opted-out', 'billing')
      expect(result.items[0].isOptedOut).toBe(true)
      expect(result.items[0].canDeliver).toBe(false)
      expect(result.items[0].skipReason).toBe('opt_out')
    })

    it('should return preview of due reminders according to active rules', async () => {
      const scheduledDate = '2026-09-10'
      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'installment_due' as const,
        offsetDays: -3,
        isEnabled: true,
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

      const dueInstallment = {
        id: testInstallmentId,
        organizationId: testOrgId,
        policyId: testPolicyId,
        installmentNumber: 2,
        dueDate: '2026-09-13', // 2026-09-10 - (-3) = 2026-09-13
        totalAmount: 18000,
        currency: 'ARS',
        status: 'pending',
        policyNumber: 'POL-100',
        companyName: 'SANCOR',
        insuredId: testInsuredId,
        insuredFullName: 'CARLOS GOMEZ',
        insuredPhone: '+5491133334444',
      }
      mockDb.where.mockResolvedValueOnce([dueInstallment])

      const result: RemindersDueResponse = await service.getDueRemindersPreview({
        organizationId: testOrgId,
        date: scheduledDate,
      } as any)

      expect(result).toBeDefined()
      expect(result.date).toBe(scheduledDate)
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('should return preview of policy expiration due reminders', async () => {
      const scheduledDate = '2026-09-10'
      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'policy_expiration' as const,
        offsetDays: -15,
        isEnabled: true,
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

      const expiringPolicy = {
        id: testPolicyId,
        policyId: testPolicyId,
        organizationId: testOrgId,
        policyNumber: 'POL-EXP-200',
        companyName: 'FEDERACION PATRONAL',
        expirationDate: '2026-09-25',
        policyStatus: 'active',
        insuredId: testInsuredId,
        insuredFullName: 'MARIA LOPEZ',
        insuredPhone: '+5491155556666',
        totalAmount: 45000,
        currency: 'ARS',
      }
      mockDb.where.mockResolvedValueOnce([expiringPolicy])

      const result = await service.getDueRemindersPreview({
        organizationId: testOrgId,
        date: scheduledDate,
        eventSource: 'policy_expiration',
      } as any)

      expect(result).toBeDefined()
      expect(result.date).toBe(scheduledDate)
      expect(result.items.length).toBe(1)
      expect(result.items[0].eventSource).toBe('policy_expiration')
      expect(result.items[0].targetDate).toBe('2026-09-25')
    })
  })


  describe('dispatchDueRemindersForOrg', () => {
    it('should dispatch reminder: create conversation, record sent message, and enqueue WhatsApp payload', async () => {
      const scheduledDate = '2026-09-10'
      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'installment_due' as const,
        offsetDays: 0,
        isEnabled: true,
        templateId: 'tmpl-due-today',
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

      const dueInstallment = {
        id: testInstallmentId,
        organizationId: testOrgId,
        policyId: testPolicyId,
        installmentNumber: 1,
        dueDate: '2026-09-10',
        totalAmount: 12500,
        currency: 'ARS',
        status: 'pending',
        policyNumber: 'POL-200',
        companyName: 'FEDERACION PATRONAL',
        insuredId: testInsuredId,
        insuredFullName: 'LAURA MARTINEZ',
        insuredPhone: '+5491144445555',
      }
      mockDb.where.mockResolvedValueOnce([dueInstallment])

      mockChannelEndpointsService.resolveWhatsAppEndpointAndCredentials.mockResolvedValueOnce({
        endpointId: 'cep-1',
        phoneNumberId: 'phone-id-1',
        credentials: { accessToken: 'token-1' },
      })
      mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
      mockConversationsService.getOrCreateActiveConversation.mockResolvedValueOnce({
        id: 'conv-1',
        organizationId: testOrgId,
        status: 'open',
      })
      mockConversationsService.linkEntityToConversation.mockResolvedValueOnce(undefined)
      mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({
        id: 'msg-1',
        status: 'sent',
      })
      mockWhatsappDispatchService.enqueueTemplateReminder.mockResolvedValueOnce(undefined)

      const summary: ReminderDispatchSummary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

      expect(summary).toBeDefined()
      expect(summary.totalEvaluated).toBeGreaterThanOrEqual(1)
      expect(summary.totalEnqueued).toBe(1)
      expect(summary.totalSkipped).toBe(0)
      expect(mockWhatsappDispatchService.enqueueTemplateReminder).toHaveBeenCalled()
    })

    it('should dispatch reminders using object argument { organizationId, date }', async () => {
      const scheduledDate = '2026-09-10'
      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'installment_due' as const,
        offsetDays: 0,
        isEnabled: true,
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])
      mockDb.where.mockResolvedValueOnce([])

      const summary = await service.dispatchDueRemindersForOrg({
        organizationId: testOrgId,
        scheduledDate,
        date: scheduledDate,
      } as any)

      expect(summary.scheduledDate).toBe(scheduledDate)
      expect(summary.totalEvaluated).toBe(0)
    })

    it('should default scheduledDate to today when date is omitted in dispatchDueRemindersForOrg', async () => {
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([])

      const todayStr = new Date().toISOString().split('T')[0]
      const summary = await service.dispatchDueRemindersForOrg({
        organizationId: testOrgId,
      } as any)

      expect(summary.scheduledDate).toBe(todayStr)
    })

    it('should mark reminder as skipped with reason no_endpoint when channel endpoint is null or throws', async () => {
      const scheduledDate = '2026-09-10'
      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'installment_due' as const,
        offsetDays: 0,
        isEnabled: true,
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

      const dueInstallment = {
        id: testInstallmentId,
        organizationId: testOrgId,
        policyId: testPolicyId,
        installmentNumber: 1,
        dueDate: '2026-09-10',
        status: 'pending',
        insuredId: testInsuredId,
        insuredPhone: '+5491144445555',
      }
      mockDb.where.mockResolvedValueOnce([dueInstallment])

      mockChannelEndpointsService.resolveWhatsAppEndpointAndCredentials.mockRejectedValueOnce(new Error('Endpoint not configured'))
      mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
      mockConversationsService.getOrCreateActiveConversation.mockResolvedValueOnce({
        id: 'conv-no-endpoint',
        organizationId: testOrgId,
      })
      mockConversationsService.linkEntityToConversation.mockResolvedValueOnce(undefined)
      mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({
        id: 'msg-no-endpoint',
        status: 'skipped',
        skipReason: 'no_endpoint',
      })

      const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

      expect(summary.totalSkipped).toBe(1)
      expect(summary.totalEnqueued).toBe(0)
      expect(mockMessagesService.recordOutboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'skipped',
          skipReason: 'no_endpoint',
        }),
      )
      expect(mockWhatsappDispatchService.enqueueTemplateReminder).not.toHaveBeenCalled()
    })

    it('should evaluate consent via consentsService: skip reminder when insured is opted out', async () => {
      const scheduledDate = '2026-09-10'
      const mockConsents = {
        isInsuredOptedOut: vi.fn().mockResolvedValueOnce(true),
      }

      const serviceWithConsent = createRemindersOrchestratorService({
        db: mockDb,
        organizationId: testOrgId,
        reminderRulesService: mockReminderRulesService,
        channelEndpointsService: mockChannelEndpointsService,
        conversationsService: mockConversationsService,
        messagesService: mockMessagesService,
        whatsappDispatchService: mockWhatsappDispatchService,
        consentsService: mockConsents,
      } as any)

      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'installment_due' as const,
        offsetDays: 0,
        isEnabled: true,
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

      const dueInstallment = {
        id: testInstallmentId,
        organizationId: testOrgId,
        policyId: testPolicyId,
        installmentNumber: 1,
        dueDate: '2026-09-10',
        status: 'pending',
        insuredId: testInsuredId,
        insuredPhone: '+5491144445555',
        isOptedOut: false,
      }
      mockDb.where.mockResolvedValueOnce([dueInstallment])

      mockChannelEndpointsService.resolveWhatsAppEndpointAndCredentials.mockResolvedValueOnce({
        endpointId: 'cep-1',
        phoneNumberId: 'phone-1',
        credentials: { accessToken: 'tok' },
      })
      mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
      mockConversationsService.getOrCreateActiveConversation.mockResolvedValueOnce({ id: 'conv-consent' })
      mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({ id: 'msg-optout', status: 'skipped' })

      const summary = await serviceWithConsent.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

      expect(mockConsents.isInsuredOptedOut).toHaveBeenCalledWith(testInsuredId, 'billing')
      expect(summary.totalSkipped).toBe(1)
      expect(summary.totalEnqueued).toBe(0)
      expect(mockWhatsappDispatchService.enqueueTemplateReminder).not.toHaveBeenCalled()
    })

    it('should catch dispatch errors from whatsappDispatchService and record in summary.errors', async () => {
      const scheduledDate = '2026-09-10'
      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'installment_due' as const,
        offsetDays: 0,
        isEnabled: true,
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

      const dueInstallment = {
        id: testInstallmentId,
        organizationId: testOrgId,
        policyId: testPolicyId,
        installmentNumber: 1,
        dueDate: '2026-09-10',
        status: 'pending',
        insuredId: testInsuredId,
        insuredPhone: '+5491144445555',
      }
      mockDb.where.mockResolvedValueOnce([dueInstallment])

      mockChannelEndpointsService.resolveWhatsAppEndpointAndCredentials.mockResolvedValueOnce({
        endpointId: 'cep-1',
        phoneNumberId: 'phone-1',
        credentials: { accessToken: 'tok' },
      })
      mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
      mockConversationsService.getOrCreateActiveConversation.mockResolvedValueOnce({ id: 'conv-err' })
      mockConversationsService.linkEntityToConversation.mockResolvedValueOnce(undefined)
      mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({ id: 'msg-err', status: 'sent' })
      mockWhatsappDispatchService.enqueueTemplateReminder.mockRejectedValueOnce(new Error('Cloudflare Queue Unavailable'))

      const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

      expect(summary.totalSkipped).toBe(1)
      expect(summary.totalEnqueued).toBe(0)
      expect(summary.errors.length).toBe(1)
      expect(summary.errors[0]).toContain('Cloudflare Queue Unavailable')
    })

    it('should mark opt-out insureds as skipped and NOT enqueue WhatsApp message', async () => {
      const scheduledDate = '2026-09-10'
      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'installment_due' as const,
        offsetDays: 0,
        isEnabled: true,
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

      const dueInstallmentOptOut = {
        id: testInstallmentId,
        organizationId: testOrgId,
        policyId: testPolicyId,
        installmentNumber: 1,
        dueDate: '2026-09-10',
        status: 'pending',
        insuredId: testInsuredId,
        insuredFullName: 'OPTED OUT USER',
        insuredPhone: '+5491199998888',
        isOptedOut: true,
      }
      mockDb.where.mockResolvedValueOnce([dueInstallmentOptOut])

      mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
      mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({
        id: 'msg-skipped',
        status: 'skipped',
      })

      const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

      expect(summary.totalSkipped).toBe(1)
      expect(summary.totalEnqueued).toBe(0)
      expect(mockWhatsappDispatchService.enqueueTemplateReminder).not.toHaveBeenCalled()
    })

    it('should mark insureds without phone number as skipped and NOT enqueue', async () => {
      const scheduledDate = '2026-09-10'
      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'installment_due' as const,
        offsetDays: 0,
        isEnabled: true,
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

      const dueInstallmentNoPhone = {
        id: testInstallmentId,
        organizationId: testOrgId,
        policyId: testPolicyId,
        installmentNumber: 1,
        dueDate: '2026-09-10',
        status: 'pending',
        insuredId: testInsuredId,
        insuredFullName: 'NO PHONE USER',
        insuredPhone: null,
      }
      mockDb.where.mockResolvedValueOnce([dueInstallmentNoPhone])

      mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
      mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({
        id: 'msg-no-phone',
        status: 'skipped',
      })

      const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

      expect(summary.totalSkipped).toBe(1)
      expect(summary.totalEnqueued).toBe(0)
      expect(mockWhatsappDispatchService.enqueueTemplateReminder).not.toHaveBeenCalled()
    })

    it('should omit paid installments from reminder dispatch', async () => {
      const scheduledDate = '2026-09-10'
      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'installment_due' as const,
        offsetDays: 0,
        isEnabled: true,
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

      // v_due_installments or query filters out status: 'paid'
      mockDb.where.mockResolvedValueOnce([])

      const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

      expect(summary.totalEvaluated).toBe(0)
      expect(summary.totalEnqueued).toBe(0)
      expect(mockMessagesService.recordOutboundMessage).not.toHaveBeenCalled()
      expect(mockWhatsappDispatchService.enqueueTemplateReminder).not.toHaveBeenCalled()
    })

    it('should enforce idempotency: skip enqueuing if deduplicationHash was already sent', async () => {
      const scheduledDate = '2026-09-10'
      const activeRule = {
        id: testRuleId,
        organizationId: testOrgId,
        eventSource: 'installment_due' as const,
        offsetDays: 0,
        isEnabled: true,
      }
      mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

      const dueInstallment = {
        id: testInstallmentId,
        organizationId: testOrgId,
        policyId: testPolicyId,
        installmentNumber: 1,
        dueDate: '2026-09-10',
        status: 'pending',
        insuredId: testInsuredId,
        insuredFullName: 'CARLOS GOMEZ',
        insuredPhone: '+5491133334444',
      }
      mockDb.where.mockResolvedValueOnce([dueInstallment])

      // isAlreadySent returns true!
      mockMessagesService.isAlreadySent.mockResolvedValueOnce(true)

      const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

      expect(summary.totalAlreadySent).toBe(1)
      expect(summary.totalEnqueued).toBe(0)
      expect(mockWhatsappDispatchService.enqueueTemplateReminder).not.toHaveBeenCalled()
    })

    describe('policy_expiration workflow', () => {
      it('should dispatch policy expiration reminder: link policy entity, record sent message, and enqueue WhatsApp', async () => {
        const scheduledDate = '2026-09-10'
        const activeRule = {
          id: testRuleId,
          organizationId: testOrgId,
          eventSource: 'policy_expiration' as const,
          offsetDays: -15,
          isEnabled: true,
          templateId: 'tmpl-policy-renewal-15d',
        }
        mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

        const expiringPolicy = {
          id: testPolicyId,
          policyId: testPolicyId,
          organizationId: testOrgId,
          policyNumber: 'POL-AUTO-999',
          companyName: 'ZURICH',
          expirationDate: '2026-09-25',
          policyStatus: 'active',
          status: 'active',
          insuredId: testInsuredId,
          insuredFullName: 'ANA GARCIA',
          insuredPhone: '+5491177778888',
        }
        mockDb.where.mockResolvedValueOnce([expiringPolicy])

        mockChannelEndpointsService.resolveWhatsAppEndpointAndCredentials.mockResolvedValueOnce({
          endpointId: 'cep-1',
          phoneNumberId: 'phone-id-1',
          credentials: { accessToken: 'token-1' },
        })
        mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
        mockConversationsService.getOrCreateActiveConversation.mockResolvedValueOnce({
          id: 'conv-pol-1',
          organizationId: testOrgId,
          status: 'open',
        })
        mockConversationsService.linkEntityToConversation.mockResolvedValueOnce(undefined)
        mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({
          id: 'msg-pol-1',
          status: 'sent',
        })
        mockWhatsappDispatchService.enqueueTemplateReminder.mockResolvedValueOnce(undefined)

        const summary: ReminderDispatchSummary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

        expect(summary).toBeDefined()
        expect(summary.totalEvaluated).toBe(1)
        expect(summary.totalEnqueued).toBe(1)
        expect(summary.totalSkipped).toBe(0)
        expect(summary.totalAlreadySent).toBe(0)
        expect(mockConversationsService.linkEntityToConversation).toHaveBeenCalledWith(
          'conv-pol-1',
          expect.objectContaining({ policyId: testPolicyId }),
        )
        expect(mockWhatsappDispatchService.enqueueTemplateReminder).toHaveBeenCalled()
      })

      it('should ignore expiring policy when policyStatus is not active', async () => {
        const scheduledDate = '2026-09-10'
        const activeRule = {
          id: testRuleId,
          organizationId: testOrgId,
          eventSource: 'policy_expiration' as const,
          offsetDays: -3,
          isEnabled: true,
        }
        mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

        const cancelledPolicy = {
          id: testPolicyId,
          organizationId: testOrgId,
          policyNumber: 'POL-CANCELLED-1',
          expirationDate: '2026-09-13',
          policyStatus: 'cancelled',
          status: 'cancelled',
          insuredId: testInsuredId,
          insuredFullName: 'INACTIVE USER',
          insuredPhone: '+5491112345678',
        }
        mockDb.where.mockResolvedValueOnce([cancelledPolicy])

        const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

        expect(summary.totalEnqueued).toBe(0)
        expect(mockWhatsappDispatchService.enqueueTemplateReminder).not.toHaveBeenCalled()
        expect(mockMessagesService.recordOutboundMessage).not.toHaveBeenCalled()
      })

      it('should mark opt-out insureds as skipped and not send WhatsApp for policy expiration', async () => {
        const scheduledDate = '2026-09-10'
        const activeRule = {
          id: testRuleId,
          organizationId: testOrgId,
          eventSource: 'policy_expiration' as const,
          offsetDays: 0,
          isEnabled: true,
        }
        mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

        const optOutPolicy = {
          id: testPolicyId,
          policyId: testPolicyId,
          organizationId: testOrgId,
          policyNumber: 'POL-OPTOUT-1',
          expirationDate: '2026-09-10',
          policyStatus: 'active',
          status: 'active',
          insuredId: testInsuredId,
          insuredFullName: 'OPTED OUT INSURED',
          insuredPhone: '+5491188889999',
          isOptedOut: true,
        }
        mockDb.where.mockResolvedValueOnce([optOutPolicy])

        mockChannelEndpointsService.resolveWhatsAppEndpointAndCredentials.mockResolvedValueOnce({
          endpointId: 'cep-1',
          phoneNumberId: 'phone-id-1',
          credentials: { accessToken: 'token-1' },
        })
        mockConversationsService.getOrCreateActiveConversation.mockResolvedValueOnce({
          id: 'conv-pol-1',
          organizationId: testOrgId,
          status: 'open',
        })
        mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
        mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({
          id: 'msg-optout',
          status: 'skipped',
        })


        const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

        expect(summary.totalSkipped).toBe(1)
        expect(summary.totalEnqueued).toBe(0)
        expect(mockWhatsappDispatchService.enqueueTemplateReminder).not.toHaveBeenCalled()
        expect(mockMessagesService.recordOutboundMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'skipped',
            skipReason: 'opt_out',
          }),
        )
      })

      it('should mark policy expiration without phone as skipped with reason missing_phone', async () => {
        const scheduledDate = '2026-09-10'
        const activeRule = {
          id: testRuleId,
          organizationId: testOrgId,
          eventSource: 'policy_expiration' as const,
          offsetDays: -30,
          isEnabled: true,
        }
        mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

        const noPhonePolicy = {
          id: testPolicyId,
          policyId: testPolicyId,
          organizationId: testOrgId,
          policyNumber: 'POL-NO-PHONE',
          expirationDate: '2026-10-10',
          policyStatus: 'active',
          status: 'active',
          insuredId: testInsuredId,
          insuredFullName: 'NO PHONE INSURED',
          insuredPhone: null,
        }
        mockDb.where.mockResolvedValueOnce([noPhonePolicy])

        mockChannelEndpointsService.resolveWhatsAppEndpointAndCredentials.mockResolvedValueOnce({
          endpointId: 'cep-1',
          phoneNumberId: 'phone-id-1',
          credentials: { accessToken: 'token-1' },
        })
        mockConversationsService.getOrCreateActiveConversation.mockResolvedValueOnce({
          id: 'conv-pol-no-phone',
          organizationId: testOrgId,
          status: 'open',
        })
        mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
        mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({
          id: 'msg-no-phone',
          status: 'skipped',
        })


        const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

        expect(summary.totalSkipped).toBe(1)
        expect(summary.totalEnqueued).toBe(0)
        expect(mockWhatsappDispatchService.enqueueTemplateReminder).not.toHaveBeenCalled()
        expect(mockMessagesService.recordOutboundMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'skipped',
            skipReason: 'missing_phone',
          }),
        )
      })

      it('should enforce idempotency: increment totalAlreadySent when policy reminder already sent', async () => {
        const scheduledDate = '2026-09-10'
        const activeRule = {
          id: testRuleId,
          organizationId: testOrgId,
          eventSource: 'policy_expiration' as const,
          offsetDays: 0,
          isEnabled: true,
        }
        mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

        const policy = {
          id: testPolicyId,
          organizationId: testOrgId,
          policyNumber: 'POL-DUP',
          expirationDate: '2026-09-10',
          policyStatus: 'active',
          status: 'active',
          insuredId: testInsuredId,
          insuredFullName: 'CARLOS GOMEZ',
          insuredPhone: '+5491133334444',
        }
        mockDb.where.mockResolvedValueOnce([policy])

        mockMessagesService.isAlreadySent.mockResolvedValueOnce(true)

        const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

        expect(summary.totalAlreadySent).toBe(1)
        expect(summary.totalEnqueued).toBe(0)
        expect(mockWhatsappDispatchService.enqueueTemplateReminder).not.toHaveBeenCalled()
      })

      it('should accurately track totalEvaluated count reflecting all candidate entities', async () => {
        const scheduledDate = '2026-09-10'
        const activeRule = {
          id: testRuleId,
          organizationId: testOrgId,
          eventSource: 'policy_expiration' as const,
          offsetDays: 0,
          isEnabled: true,
        }
        mockReminderRulesService.getActiveRules.mockResolvedValueOnce([activeRule])

        const policies = [
          {
            id: 'pol-1',
            organizationId: testOrgId,
            policyNumber: 'POL-1',
            expirationDate: '2026-09-10',
            policyStatus: 'active',
            insuredId: 'ins-1',
            insuredFullName: 'USER 1',
            insuredPhone: '+5491111111111',
          },
          {
            id: 'pol-2',
            organizationId: testOrgId,
            policyNumber: 'POL-2',
            expirationDate: '2026-09-10',
            policyStatus: 'active',
            insuredId: 'ins-2',
            insuredFullName: 'USER 2',
            insuredPhone: null, // skipped
          },
          {
            id: 'pol-3',
            organizationId: testOrgId,
            policyNumber: 'POL-3',
            expirationDate: '2026-09-10',
            policyStatus: 'active',
            insuredId: 'ins-3',
            insuredFullName: 'USER 3',
            insuredPhone: '+5491133333333', // already sent
          },
        ]
        mockDb.where.mockResolvedValueOnce(policies)

        mockChannelEndpointsService.resolveWhatsAppEndpointAndCredentials.mockResolvedValue({
          endpointId: 'cep-1',
          phoneNumberId: 'phone-id-1',
          credentials: { accessToken: 'token-1' },
        })
        mockConversationsService.getOrCreateActiveConversation.mockResolvedValue({
          id: 'conv-1',
          organizationId: testOrgId,
        })
        mockConversationsService.linkEntityToConversation.mockResolvedValue(undefined)

        // pol-1: not sent
        mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
        mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({ id: 'msg-1', status: 'sent' })
        mockWhatsappDispatchService.enqueueTemplateReminder.mockResolvedValueOnce(undefined)

        // pol-2: no phone -> skipped
        mockMessagesService.isAlreadySent.mockResolvedValueOnce(false)
        mockMessagesService.recordOutboundMessage.mockResolvedValueOnce({ id: 'msg-2', status: 'skipped' })

        // pol-3: already sent
        mockMessagesService.isAlreadySent.mockResolvedValueOnce(true)

        const summary = await service.dispatchDueRemindersForOrg(testOrgId, scheduledDate)

        expect(summary.totalEvaluated).toBe(3)
        expect(summary.totalEnqueued).toBe(1)
        expect(summary.totalSkipped).toBe(1)
        expect(summary.totalAlreadySent).toBe(1)
      })
    })
  })
})

