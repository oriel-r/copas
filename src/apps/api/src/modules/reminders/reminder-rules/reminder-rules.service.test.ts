import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createReminderRulesService } from './reminder-rules.service'
import { REMINDER_EVENT_PRESETS } from '@copas/contracts'
import type { CreateReminderRuleRequest, ReminderRule, UpdateReminderRuleRequest } from '@copas/contracts'

describe('reminder-rules.service', () => {
  let mockRepo: any
  let service: ReturnType<typeof createReminderRulesService>

  beforeEach(() => {
    mockRepo = {
      findAll: vi.fn(),
      findActive: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
    service = createReminderRulesService({ reminderRulesRepository: mockRepo })
  })

  describe('constructor and dependency injection', () => {
    it('should initialize with object argument containing reminderRulesRepository', () => {
      const s = createReminderRulesService({ reminderRulesRepository: mockRepo })
      expect(s).toBeDefined()
      expect(typeof s.listRules).toBe('function')
      expect(typeof s.getActiveRules).toBe('function')
      expect(typeof s.getRuleById).toBe('function')
      expect(typeof s.createRule).toBe('function')
      expect(typeof s.updateRule).toBe('function')
      expect(typeof s.deleteRule).toBe('function')
    })

    it('should initialize with positional argument reminderRulesRepository', () => {
      const s = createReminderRulesService(mockRepo as any)
      expect(s).toBeDefined()
      expect(typeof s.listRules).toBe('function')
      expect(typeof s.createRule).toBe('function')
    })
  })

  describe('presets', () => {
    it('should match the standard REMINDER_EVENT_PRESETS specifications', () => {
      expect(REMINDER_EVENT_PRESETS).toBeDefined()
      expect(REMINDER_EVENT_PRESETS.length).toBe(4)

      const installmentPresets = REMINDER_EVENT_PRESETS.filter((p) => p.eventSource === 'installment_due')
      const policyPresets = REMINDER_EVENT_PRESETS.filter((p) => p.eventSource === 'policy_expiration')

      expect(installmentPresets.map((p) => p.offsetDays)).toEqual([-3, 0])
      expect(policyPresets.map((p) => p.offsetDays)).toEqual([-3, 0])
    })
  })

  describe('listRules', () => {
    it('should return list of rules from repository for organization', async () => {
      const rules: ReminderRule[] = [
        {
          id: 'rule-1',
          organizationId: 'org-1',
          eventSource: 'installment_due',
          offsetDays: -3,
          templateId: 'tmpl-1',
          isEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]
      mockRepo.findAll.mockResolvedValueOnce(rules)

      const result = await service.listRules('org-1')
      expect(result).toEqual(rules)
      expect(mockRepo.findAll).toHaveBeenCalledWith('org-1')
    })
  })

  describe('getActiveRules', () => {
    it('should return active rules for organization', async () => {
      const activeRules: ReminderRule[] = [
        {
          id: 'rule-1',
          organizationId: 'org-1',
          eventSource: 'installment_due',
          offsetDays: -3,
          templateId: 'tmpl-1',
          isEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]
      mockRepo.findActive.mockResolvedValueOnce(activeRules)

      const result = await service.getActiveRules('org-1')
      expect(result).toEqual(activeRules)
      expect(mockRepo.findActive).toHaveBeenCalledWith('org-1')
    })
  })

  describe('getRuleById', () => {
    it('should return rule when found', async () => {
      const rule: ReminderRule = {
        id: 'rule-1',
        organizationId: 'org-1',
        eventSource: 'installment_due',
        offsetDays: -3,
        templateId: 'tmpl-1',
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.findById.mockResolvedValueOnce(rule)

      const result = await service.getRuleById('rule-1')
      expect(result).toEqual(rule)
      expect(mockRepo.findById).toHaveBeenCalledWith('rule-1')
    })

    it('should return null when not found', async () => {
      mockRepo.findById.mockResolvedValueOnce(null)

      const result = await service.getRuleById('non-existent')
      expect(result).toBeNull()
      expect(mockRepo.findById).toHaveBeenCalledWith('non-existent')
    })

    it('should propagate tx in getRuleById', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.findById.mockResolvedValueOnce(null)

      await service.getRuleById('rule-1', mockTx)
      expect(mockRepo.findById).toHaveBeenCalledWith('rule-1', mockTx)
    })
  })

  describe('createRule', () => {
    it.each([
      { offsetDays: -30, desc: 'boundary minimum (-30)' },
      { offsetDays: -3, desc: 'standard advance notice (-3)' },
      { offsetDays: 0, desc: 'due date notice (0)' },
      { offsetDays: 30, desc: 'boundary maximum (30)' },
    ])('should create rule successfully with valid offsetDays: $desc', async ({ offsetDays }) => {
      const input: CreateReminderRuleRequest = {
        organizationId: 'org-1',
        eventSource: 'installment_due',
        offsetDays,
        isEnabled: true,
      }
      const created: ReminderRule = {
        id: 'rule-new',
        ...input,
        templateId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.create.mockResolvedValueOnce(created)

      const result = await service.createRule(input)
      expect(result).toEqual(created)
      expect(mockRepo.create).toHaveBeenCalledWith(input)
    })

    it('should propagate tx in createRule', async () => {
      const mockTx = { isTx: true } as any
      const input: CreateReminderRuleRequest = {
        organizationId: 'org-1',
        eventSource: 'installment_due',
        offsetDays: 0,
        isEnabled: true,
      }
      mockRepo.create.mockResolvedValueOnce({ id: 'rule-tx', ...input })

      await service.createRule(input, mockTx)
      expect(mockRepo.create).toHaveBeenCalledWith(input, mockTx)
    })

    it.each([
      { offsetDays: -31, desc: 'below minimum (-31)' },
      { offsetDays: 31, desc: 'above maximum (31)' },
      { offsetDays: 1.5, desc: 'non-integer fractional (1.5)' },
    ])('should throw exact validation error when offsetDays is invalid: $desc', async ({ offsetDays }) => {
      const input = {
        organizationId: 'org-1',
        eventSource: 'installment_due',
        offsetDays,
        isEnabled: true,
      }

      await expect(service.createRule(input as any)).rejects.toThrow(
        'offsetDays must be an integer between -30 and 30',
      )
      expect(mockRepo.create).not.toHaveBeenCalled()
    })
  })

  describe('updateRule', () => {
    it('should update rule fields and delegate to repository', async () => {
      const updateData: UpdateReminderRuleRequest = {
        offsetDays: 5,
        isEnabled: false,
      }
      const updated: ReminderRule = {
        id: 'rule-1',
        organizationId: 'org-1',
        eventSource: 'installment_due',
        offsetDays: 5,
        templateId: null,
        isEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }
      mockRepo.update.mockResolvedValueOnce(updated)

      const result = await service.updateRule('rule-1', updateData)
      expect(result).toEqual(updated)
      expect(mockRepo.update).toHaveBeenCalledWith('rule-1', updateData)
    })

    it('should propagate tx in updateRule', async () => {
      const mockTx = { isTx: true } as any
      const updateData: UpdateReminderRuleRequest = { isEnabled: true }
      mockRepo.update.mockResolvedValueOnce({ id: 'rule-1', isEnabled: true })

      await service.updateRule('rule-1', updateData, mockTx)
      expect(mockRepo.update).toHaveBeenCalledWith('rule-1', updateData, mockTx)
    })

    it('should enable and disable rule by updating isEnabled', async () => {
      const enabledRule = { id: 'rule-1', isEnabled: true }
      mockRepo.update.mockResolvedValueOnce(enabledRule)

      const resultEnable = await service.updateRule('rule-1', { isEnabled: true })
      expect(resultEnable).toEqual(enabledRule)

      const disabledRule = { id: 'rule-1', isEnabled: false }
      mockRepo.update.mockResolvedValueOnce(disabledRule)

      const resultDisable = await service.updateRule('rule-1', { isEnabled: false })
      expect(resultDisable).toEqual(disabledRule)
    })

    it('should reject invalid offsetDays on update with exact validation message', async () => {
      const invalidUpdate = { offsetDays: 35 }

      await expect(service.updateRule('rule-1', invalidUpdate as any)).rejects.toThrow(
        'offsetDays must be an integer between -30 and 30',
      )
      expect(mockRepo.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteRule', () => {
    it('should delegate rule deletion to repository', async () => {
      mockRepo.delete.mockResolvedValueOnce(true)

      const result = await service.deleteRule('rule-1')
      expect(result).toBeTruthy()
      expect(mockRepo.delete).toHaveBeenCalledWith('rule-1')
    })

    it('should propagate tx in deleteRule', async () => {
      const mockTx = { isTx: true } as any
      mockRepo.delete.mockResolvedValueOnce(false)

      const result = await service.deleteRule('rule-1', mockTx)
      expect(result).toBe(false)
      expect(mockRepo.delete).toHaveBeenCalledWith('rule-1', mockTx)
    })
  })
})
