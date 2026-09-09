import type {
  CreateReminderRuleRequest,
  ReminderRule,
  UpdateReminderRuleRequest,
} from '@copas/contracts'
import type { ReminderRulesRepository } from './reminder-rules.repository'

export function createReminderRulesService(reminderRulesRepoArg: ReminderRulesRepository) {
  const reminderRulesRepo = (reminderRulesRepoArg as any).reminderRulesRepository || reminderRulesRepoArg

  return {
    listRules: async (orgId?: string): Promise<ReminderRule[]> => {
      return orgId ? await reminderRulesRepo.findAll(orgId) : await reminderRulesRepo.findAll()
    },

    getActiveRules: async (orgId?: string): Promise<ReminderRule[]> => {
      return orgId ? await reminderRulesRepo.findActive(orgId) : await reminderRulesRepo.findActive()
    },

    getRuleById: async (id: string, orgId?: string): Promise<ReminderRule | null> => {
      return orgId ? await reminderRulesRepo.findById(id, orgId) : await reminderRulesRepo.findById(id)
    },

    createRule: async (data: CreateReminderRuleRequest, orgId?: string): Promise<ReminderRule> => {
      if (!Number.isInteger(data.offsetDays) || data.offsetDays < -30 || data.offsetDays > 30) {
        throw new Error('offsetDays must be an integer between -30 and 30')
      }
      return orgId ? await reminderRulesRepo.create(data, orgId) : await reminderRulesRepo.create(data)
    },

    updateRule: async (id: string, data: UpdateReminderRuleRequest, orgId?: string): Promise<ReminderRule> => {
      if (data.offsetDays !== undefined && (!Number.isInteger(data.offsetDays) || data.offsetDays < -30 || data.offsetDays > 30)) {
        throw new Error('offsetDays must be an integer between -30 and 30')
      }
      const updated = orgId ? await reminderRulesRepo.update(id, data, orgId) : await reminderRulesRepo.update(id, data)
      if (!updated) throw new Error('Rule not found')
      return updated
    },

    deleteRule: async (id: string, orgId?: string): Promise<boolean> => {
      return orgId ? await reminderRulesRepo.delete(id, orgId) : await reminderRulesRepo.delete(id)
    },
  }
}

export type ReminderRulesService = ReturnType<typeof createReminderRulesService>
