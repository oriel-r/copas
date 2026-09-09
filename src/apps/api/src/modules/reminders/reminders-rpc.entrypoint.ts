import { WorkerEntrypoint } from 'cloudflare:workers'
import type { ReminderDispatchParams, ReminderDispatchSummary } from '@copas/contracts'
import { createRemindersOrchestratorService } from './orchestrator/reminders-orchestrator.service'
import { createReminderRulesService } from './reminder-rules/reminder-rules.service'
import { createReminderRulesRepository } from './reminder-rules/reminder-rules.repository'
import { createInsuranceModule } from '../insurance/insurance.module'
import { createCommunicationsModule } from '../communications/communications.module'

export class RemindersRpcEntrypoint extends WorkerEntrypoint<any> {
  async dispatchDueReminders(params: ReminderDispatchParams): Promise<ReminderDispatchSummary> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.scheduledDate)) {
      throw new Error('invalid date format, must be YYYY-MM-DD')
    }

    const db = this.env.DB
    const q = this.env.WHATSAPP_QUEUE ?? this.env.WHATSAPP_OUTBOUND_QUEUE
    
    // We get the active organizations (this is normally passed or retrieved, but for now we query them or there is a specific one? 
    // Wait, the orchestrator needs an organizationId. Since it's a multi-tenant DB, we need to iterate over all organizations?)
    // Let's get distinct organizationIds from reminder_rules:
    const stmt = db.prepare(`SELECT DISTINCT organizationId FROM reminder_rules WHERE isEnabled = 1 AND deletedAt IS NULL`)
    const res = await stmt.all()
    const orgIds = (res.results || []).map((r: any) => r.organizationId)
    
    const summary: ReminderDispatchSummary = {
      scheduledDate: params.scheduledDate,
      totalEvaluated: 0,
      totalEnqueued: 0,
      totalSkipped: 0,
      totalAlreadySent: 0,
      errors: []
    }

    for (const orgId of orgIds) {
      const repo = createReminderRulesRepository(db, orgId)
      const service = createReminderRulesService(repo)
      const insMod = createInsuranceModule(db, orgId, this.env.DOCUMENT_BUCKET, this.env.AI_QUEUE)
      const commMod = createCommunicationsModule(db, orgId, q, {
        platformWhatsAppAccessToken: this.env.PLATFORM_WHATSAPP_ACCESS_TOKEN ?? this.env.WHATSAPP_ACCESS_TOKEN,
        platformWhatsAppPhoneNumberId: this.env.PLATFORM_WHATSAPP_PHONE_NUMBER_ID ?? this.env.WHATSAPP_PHONE_NUMBER_ID,
        platformWhatsAppWabaId: this.env.PLATFORM_WHATSAPP_WABA_ID ?? this.env.WHATSAPP_WABA_ID,
      })

      const orchestrator = createRemindersOrchestratorService(db, orgId, service, insMod, commMod)
      const orgSummary = await orchestrator.dispatchDueRemindersForOrg(params)

      summary.totalEvaluated += orgSummary.totalEvaluated
      summary.totalEnqueued += orgSummary.totalEnqueued
      summary.totalSkipped += orgSummary.totalSkipped
      summary.totalAlreadySent += orgSummary.totalAlreadySent
      if (orgSummary.errors && orgSummary.errors.length > 0) {
        summary.errors!.push(...orgSummary.errors)
      }
    }
    
    if (summary.errors && summary.errors.length === 0) {
      summary.errors = []
    }
    
    return summary
  }
}
