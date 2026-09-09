import type { D1Database } from '@cloudflare/workers-types'
import type { InsuranceModule } from '../insurance/insurance.module'
import type { CommunicationsModule } from '../communications/communications.module'

import { createReminderRulesRepository } from './reminder-rules/reminder-rules.repository'
import { createReminderRulesService } from './reminder-rules/reminder-rules.service'
import { createRemindersOrchestratorService } from './orchestrator/reminders-orchestrator.service'

export function createRemindersModule(
  db: D1Database,
  organizationId: string,
  insuranceModule: InsuranceModule,
  communicationsModule: CommunicationsModule,
) {
  const rulesRepo = createReminderRulesRepository(db, organizationId)
  const rulesService = createReminderRulesService(rulesRepo)
  const orchestrator = createRemindersOrchestratorService(
    db,
    organizationId,
    rulesService,
    insuranceModule,
    communicationsModule,
  )

  return {
    rules: rulesService,
    orchestrator,
  }
}

export type RemindersModule = ReturnType<typeof createRemindersModule>
