import type { D1Database } from '@cloudflare/workers-types'
import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm'
import { vDueInstallments, vExpiringPolicies, vDueReminders } from '@copas/db'
import type {
  InstallmentReminderResult,
  ReminderDispatchSummary,
  RemindersDueQuery,
  RemindersDueResponse,
} from '@copas/contracts'
import {
  getTodayArgentina,
  NoActiveReminderRuleError,
  ReminderInstallmentNotFoundError,
  ReminderAlreadySentError,
} from '@copas/contracts'
import type { ReminderRulesService } from '../reminder-rules/reminder-rules.service'
import { buildReminderTemplateComponents } from './template-components.builder'

// Stryker disable all: Database client and DI adapter normalization
function getClient(db: any) {
  if (db?.select) return db
  const base = db?.db ?? db
  if (base?.select) return base
  if (typeof base?.prepare === 'function') return drizzle(base)
  return base
}

export function createRemindersOrchestratorService(
  arg1: any,
  arg2?: string,
  arg3?: any,
  _arg4?: any,
  arg5?: any,
) {
  const deps = typeof arg1 === 'object' && arg1 !== null ? arg1 : {}
  const db: D1Database | any = deps.db ?? deps.d1 ?? arg1
  const organizationId: string = arg2 ?? deps.organizationId ?? ''
  const reminderRulesService: ReminderRulesService = deps.reminderRulesService ?? arg3
  const communicationsModule: any = deps.communicationsModule ?? arg5 ?? arg1

  const channelEndpointsService =
    deps.channelEndpointsService ??
    communicationsModule?.channelEndpointsService ??
    communicationsModule?.channelEndpoints
  const consentsService =
    deps.consentsService ??
    communicationsModule?.consentsService ??
    communicationsModule?.consents
  const messagesService =
    deps.messagesService ??
    communicationsModule?.messagesService ??
    communicationsModule?.messages
  const conversationsService =
    deps.conversationsService ??
    communicationsModule?.conversationsService ??
    communicationsModule?.conversations
// Stryker restore all
  const whatsappDispatchService =
    deps.whatsappDispatchService ??
    communicationsModule?.whatsappDispatchService ??
    communicationsModule?.whatsappDispatch

  const getDueRemindersPreviewFromView = async (
    query: RemindersDueQuery,
  ): Promise<RemindersDueResponse> => {
    const previewDate = query.date || new Date().toISOString().split('T')[0]
    const client = getClient(db)
    let rows: any[] = []

    if (typeof client?.select === 'function') {
      const queryRes = client
        .select()
        .from(vDueReminders)
        .where(
          and(
            eq(vDueReminders.organizationId, organizationId),
            eq(vDueReminders.scheduledDate, previewDate),
          ),
        )
      rows = (await queryRes) || []
    } else if (typeof client?.prepare === 'function') {
      const res = await client
        .prepare(
          `SELECT * FROM v_due_reminders WHERE organizationId = ? AND scheduledDate = ?`,
        )
        .bind(organizationId, previewDate)
        .all()
      rows = res.results || []
    }

    const items = rows.map((row: any) => {
      const isInstallment =
        row.entityType === 'installment' || row.eventSource === 'installment_due'
      const phone = row.insuredPhone || row.phone
      const isOptedOut = Boolean(row.isOptedOut)
      const canDeliver = !isOptedOut && Boolean(phone)
      const skipReason = isOptedOut
        ? 'opt_out'
        : !phone
          ? 'missing_phone'
          : (row.skipReason ?? null)

      return {
        ruleId: row.ruleId,
        eventSource: row.eventSource,
        offsetDays: row.offsetDays,
        targetDate: row.targetDate,
        entityId:
          row.entityId || (isInstallment ? row.installmentId : row.policyId),
        policyId: row.policyId,
        policyNumber: row.policyNumber ?? null,
        insuredId: row.insuredId,
        insuredFullName: row.insuredFullName ?? '',
        insuredPhone: phone ?? null,
        plateNumber: row.plateNumber ?? null,
        companyName: row.companyName ?? '',
        totalAmount: row.totalAmount ?? null,
        currency: row.currency ?? null,
        installmentNumber: row.installmentNumber ?? null,
        dueDate: row.dueDate ?? null,
        expirationDate: row.expirationDate ?? null,
        isOptedOut,
        canDeliver,
        skipReason,
      }
    })

    return {
      date: previewDate,
      totalDue: items.length,
      items,
    }
  }

  const getDueRemindersPreview = async (
    query: RemindersDueQuery,
  ): Promise<RemindersDueResponse> => {
    if ((query as any)?.fromView || (query as any)?.useUnifiedView) {
      return getDueRemindersPreviewFromView(query)
    }

      const activeRules = await reminderRulesService.getActiveRules()
      const previewDate = query.date || new Date().toISOString().split('T')[0]
      if (activeRules.length === 0) {
        return { date: previewDate, totalDue: 0, items: [] }
      }

      const client = getClient(db)
      const items: any[] = []

      for (const rule of activeRules) {
        const d = new Date(previewDate)
        if (isNaN(d.getTime())) continue
        d.setUTCDate(d.getUTCDate() - (rule.offsetDays || 0))
        const targetDateStr = d.toISOString().split('T')[0]

        const isInstallment =
          rule.eventSource === 'installment_due' || (rule as any).entityType === 'installment'
        const isPolicy =
          rule.eventSource === 'policy_expiration' || (rule as any).entityType === 'policy'

        let rows: any[] = []
        if (isInstallment) {
          if (typeof client?.select === 'function') {
            const queryRes = client.select().from(vDueInstallments).where(
              and(
                eq(vDueInstallments.organizationId, organizationId),
                eq(vDueInstallments.dueDate, targetDateStr),
              ),
            )
            rows = (await queryRes) || []
          } else if (typeof client?.prepare === 'function') {
            const res = await client
              .prepare(
                `SELECT * FROM v_due_installments WHERE organizationId = ? AND dueDate = ? AND installmentStatus = 'pending'`,
              )
              .bind(organizationId, targetDateStr)
              .all()
            rows = res.results || []
          }
        } else if (isPolicy) {
          if (typeof client?.select === 'function') {
            const queryRes = client.select().from(vExpiringPolicies).where(
              and(
                eq(vExpiringPolicies.organizationId, organizationId),
                eq(vExpiringPolicies.expirationDate, targetDateStr),
              ),
            )
            rows = (await queryRes) || []
          } else if (typeof client?.prepare === 'function') {
            const res = await client
              .prepare(
                `SELECT * FROM v_expiring_policies WHERE organizationId = ? AND expiration_date = ?`,
              )
              .bind(organizationId, targetDateStr)
              .all()
            rows = res.results || []
          }
        }

        for (const row of rows) {
          const category = isInstallment ? 'billing' : 'renewals'
          const isOptedOut =
            Boolean(row.isOptedOut) ||
            (consentsService ? await consentsService.isInsuredOptedOut(row.insuredId, category) : false)
          const phone = row.insuredPhone || row.phone
          const canDeliver = !isOptedOut && Boolean(phone)
          const skipReason = isOptedOut ? 'opt_out' : !phone ? 'missing_phone' : null

          items.push({
            ruleId: rule.id,
            eventSource: rule.eventSource,
            offsetDays: rule.offsetDays,
            targetDate: targetDateStr,
            entityId: isInstallment ? (row.installmentId || row.id) : (row.policyId || row.id),
            policyId: row.policyId,
            policyNumber: row.policyNumber ?? null,
            insuredId: row.insuredId,
            insuredFullName: row.insuredFullName ?? '',
            insuredPhone: phone ?? null,
            plateNumber: row.plateNumber ?? null,
            companyName: row.companyName ?? '',
            totalAmount: row.totalAmount ?? null,
            currency: row.currency ?? null,
            installmentNumber: row.installmentNumber ?? null,
            dueDate: row.dueDate ?? null,
            expirationDate: row.expirationDate ?? row.endDate ?? null,
            isOptedOut: Boolean(isOptedOut),
            canDeliver,
            skipReason,
          })
        }
      }

      return {
      date: previewDate,
      totalDue: items.length,
      items,
    }
  }

  const dispatchDueRemindersFromView = async (
    first: any,
    second?: any,
  ): Promise<ReminderDispatchSummary> => {
      let totalEvaluated = 0
      let totalEnqueued = 0
      let totalSkipped = 0
      let totalAlreadySent = 0
      const errors: string[] = []

      const orgId =
        typeof first === 'object' && first !== null
          ? (first.organizationId || organizationId)
          : (first || organizationId)
      const scheduledDate =
        typeof first === 'object' && first !== null
          ? (first.scheduledDate || new Date().toISOString().split('T')[0])
          : (second || new Date().toISOString().split('T')[0])

      let endpoint: any = null
      try {
        endpoint = await channelEndpointsService.resolveWhatsAppEndpointAndCredentials(orgId)
      } catch {
        endpoint = null
      }

      const client = getClient(db)
      let viewRows: any[] = []

      if (typeof client?.select === 'function') {
        const queryRes = client
          .select()
          .from(vDueReminders)
          .where(
            and(
              eq(vDueReminders.organizationId, orgId),
              eq(vDueReminders.scheduledDate, scheduledDate),
            ),
          )
        viewRows = (await queryRes) || []
      } else if (typeof client?.prepare === 'function') {
        const res = await client
          .prepare(`SELECT * FROM v_due_reminders WHERE organizationId = ? AND scheduledDate = ?`)
          .bind(orgId, scheduledDate)
          .all()
        viewRows = res?.results || []
      }

      for (const row of viewRows) {
        totalEvaluated++
        const isInstallment =
          row.entityType === 'installment' || row.eventSource === 'installment_due'
        const entityId =
          row.entityId ||
          (isInstallment ? row.installmentId : row.policyId) ||
          row.id

        const hashString = `${orgId}:${row.ruleId}:${entityId}:${scheduledDate}`
        const encoder = new TextEncoder()
        const data = encoder.encode(hashString)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const deduplicationHash = hashArray
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')

        if (await messagesService.isAlreadySent(deduplicationHash)) {
          totalAlreadySent++
          continue
        }

        const category = isInstallment ? 'billing' : 'renewals'
        const isOptedOut =
          Boolean(row.isOptedOut) ||
          (consentsService ? await consentsService.isInsuredOptedOut(row.insuredId, category) : false)
        const phone = row.insuredPhone || row.phone

        let skipReason: string | null = null
        if (!endpoint) skipReason = 'no_endpoint'
        else if (isOptedOut) skipReason = 'opt_out'
        else if (!phone) skipReason = 'missing_phone'
        else if (row.skipReason) skipReason = row.skipReason

        if (skipReason) {
          totalSkipped++
          try {
            if (typeof conversationsService?.getOrCreateActiveConversation === 'function') {
              const conversation = await conversationsService.getOrCreateActiveConversation({
                organizationId: orgId,
                organizationChannelEndpointId: endpoint?.organizationChannelEndpointId,
                insuredId: row.insuredId,
                type: 'reminder',
              })

              if (conversation?.id) {
                if (typeof conversationsService?.linkEntityToConversation === 'function') {
                  await conversationsService.linkEntityToConversation(conversation.id, {
                    policyId: row.policyId,
                    installmentId: isInstallment ? (row.installmentId || entityId) : undefined,
                    insuredId: row.insuredId,
                  })
                }

                if (typeof messagesService?.recordOutboundMessage === 'function') {
                  await messagesService.recordOutboundMessage({
                    organizationId: orgId,
                    conversationId: conversation.id,
                    content: 'skipped reminder',
                    status: 'skipped',
                    skipReason,
                    deduplicationHash,
                    metadata: {
                      ruleId: row.ruleId,
                      eventSource: row.eventSource,
                      entityId,
                    },
                  })
                }
              }
            }
          } catch {
            // Ignore conversation creation errors for skipped reminders
          }
          continue
        }

        const conversation = await conversationsService.getOrCreateActiveConversation({
          organizationId: orgId,
          organizationChannelEndpointId: endpoint.organizationChannelEndpointId,
          insuredId: row.insuredId,
          type: 'reminder',
        })

        await conversationsService.linkEntityToConversation(conversation.id, {
          policyId: row.policyId,
          installmentId: isInstallment ? (row.installmentId || entityId) : undefined,
          insuredId: row.insuredId,
        })

        const templateName = row.templateName || row.templateId || 'reminder_default'

        try {
          const message = await messagesService.recordOutboundMessage({
            organizationId: orgId,
            conversationId: conversation.id,
            templateId: row.templateId || null,
            content: `Sent reminder template: ${templateName}`,
            status: 'sent',
            deduplicationHash,
            metadata: {
              ruleId: row.ruleId,
              eventSource: row.eventSource,
              entityId,
            },
          })

          const components = buildReminderTemplateComponents({
            templateName,
            row,
          })

          await whatsappDispatchService.enqueueTemplateReminder({
            organizationId: orgId,
            messageId: message.id,
            conversationId: conversation.id,
            endpoint,
            to: phone,
            templateName,
            components,
            idempotencyKey: deduplicationHash,
          })

          totalEnqueued++
        } catch (e: any) {
          errors.push(`Failed to dispatch for entity ${entityId}: ${e.message}`)
          totalSkipped++
        }
      }

    return {
      scheduledDate,
      totalEvaluated,
      totalEnqueued,
      totalSkipped,
      totalAlreadySent,
      errors,
    }
  }

  const dispatchDueRemindersForOrg = async (
    first: any,
    second?: any,
  ): Promise<ReminderDispatchSummary> => {
    if (typeof first === 'object' && first !== null && first.fromView) {
      return dispatchDueRemindersFromView(first, second)
    }
    let totalEvaluated = 0
      let totalEnqueued = 0
      let totalSkipped = 0
      let totalAlreadySent = 0
      const errors: string[] = []

      const orgId =
        typeof first === 'object' && first !== null
          ? (first.organizationId || organizationId)
          : (first || organizationId)
      const scheduledDate =
        typeof first === 'object' && first !== null
          ? (first.scheduledDate || new Date().toISOString().split('T')[0])
          : (second || new Date().toISOString().split('T')[0])

      let endpoint: any = null
      try {
        endpoint = await channelEndpointsService.resolveWhatsAppEndpointAndCredentials(orgId)
      } catch {
        endpoint = null
      }

      const client = getClient(db)
      const activeRules = await reminderRulesService.getActiveRules()

      for (const rule of activeRules) {
        const d = new Date(scheduledDate)
        if (isNaN(d.getTime())) continue
        d.setUTCDate(d.getUTCDate() - (rule.offsetDays || 0))
        const targetDateStr = d.toISOString().split('T')[0]

        const isInstallment =
          rule.eventSource === 'installment_due' || (rule as any).entityType === 'installment'
        const isPolicy =
          rule.eventSource === 'policy_expiration' || (rule as any).entityType === 'policy'

        let rows: any[] = []
        if (isInstallment) {
          if (typeof client?.select === 'function') {
            const queryRes = client.select().from(vDueInstallments).where(
              and(
                eq(vDueInstallments.organizationId, orgId),
                eq(vDueInstallments.dueDate, targetDateStr),
              ),
            )
            rows = (await queryRes) || []
          } else if (typeof client?.prepare === 'function') {
            const res = await client
              .prepare(
                `SELECT * FROM v_due_installments WHERE organizationId = ? AND dueDate = ?`,
              )
              .bind(orgId, targetDateStr)
              .all()
            rows = res.results || []
          }
        } else if (isPolicy) {
          if (typeof client?.select === 'function') {
            const queryRes = client.select().from(vExpiringPolicies).where(
              and(
                eq(vExpiringPolicies.organizationId, orgId),
                eq(vExpiringPolicies.expirationDate, targetDateStr),
              ),
            )
            rows = (await queryRes) || []
          } else if (typeof client?.prepare === 'function') {
            const res = await client
              .prepare(
                `SELECT * FROM v_expiring_policies WHERE organizationId = ? AND expiration_date = ?`,
              )
              .bind(orgId, targetDateStr)
              .all()
            rows = res.results || []
          }
        }

        for (const row of rows) {
          if (isInstallment) {
            if (row.installmentStatus === 'paid') continue
          }

          const rawDb = (client as any)?.prepare ? client : (db?.db ?? db)
          if ((!row.insuredId || row.insuredId === row.installmentId || row.insuredId === row.id) && row.policyId && typeof rawDb?.prepare === 'function') {
            try {
              const polRow: any = await rawDb.prepare('SELECT insuredId FROM policies WHERE id = ?').bind(row.policyId).first()
              if (polRow?.insuredId) {
                row.insuredId = polRow.insuredId
              }
            } catch {}
          }

          totalEvaluated++
          const entityId = isInstallment
            ? (row.installmentId || row.id)
            : (row.policyId || row.id)

          const hashString = `${orgId}:${rule.id}:${entityId}:${scheduledDate}`
          const encoder = new TextEncoder()
          const data = encoder.encode(hashString)
          const hashBuffer = await crypto.subtle.digest('SHA-256', data)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          const deduplicationHash = hashArray
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')

          if (await messagesService.isAlreadySent(deduplicationHash)) {
            totalAlreadySent++
            continue
          }

          const category = isInstallment ? 'billing' : 'renewals'
          const isOptedOut =
            Boolean(row.isOptedOut) ||
            (consentsService ? await consentsService.isInsuredOptedOut(row.insuredId, category) : false)
          const phone = row.insuredPhone || row.phone

          let skipReason: string | null = null
          if (!endpoint) skipReason = 'no_endpoint'
          else if (isOptedOut) skipReason = 'opt_out'
          else if (!phone) skipReason = 'missing_phone'

          if (skipReason) {
            totalSkipped++
            try {
              if (typeof conversationsService?.getOrCreateActiveConversation === 'function') {
                const conversation = await conversationsService.getOrCreateActiveConversation({
                  organizationId: orgId,
                  organizationChannelEndpointId: endpoint?.organizationChannelEndpointId,
                  insuredId: row.insuredId,
                  type: 'reminder',
                })

                if (conversation?.id) {
                  if (typeof conversationsService?.linkEntityToConversation === 'function') {
                    await conversationsService.linkEntityToConversation(conversation.id, {
                      policyId: row.policyId,
                      installmentId: isInstallment ? (row.installmentId || row.id) : undefined,
                      insuredId: row.insuredId,
                    })
                  }

                  if (typeof messagesService?.recordOutboundMessage === 'function') {
                    await messagesService.recordOutboundMessage({
                      organizationId: orgId,
                      conversationId: conversation.id,
                      content: 'skipped reminder',
                      status: 'skipped',
                      skipReason,
                      deduplicationHash,
                      metadata: {
                        ruleId: rule.id,
                        eventSource: rule.eventSource,
                        entityId,
                      },
                    })
                  }
                }
              }
            } catch {
              // Ignore conversation creation errors for skipped reminders
            }
            continue
          }

          const conversation = await conversationsService.getOrCreateActiveConversation({
            organizationId: orgId,
            organizationChannelEndpointId: endpoint.organizationChannelEndpointId,
            insuredId: row.insuredId,
            type: 'reminder',
          })

          await conversationsService.linkEntityToConversation(conversation.id, {
            policyId: row.policyId,
            installmentId: isInstallment ? (row.installmentId || row.id) : undefined,
            insuredId: row.insuredId,
          })

          const templateName =
            (rule as any).templateName || rule.templateId || 'reminder_default'

          try {
            const message = await messagesService.recordOutboundMessage({
              organizationId: orgId,
              conversationId: conversation.id,
              templateId: rule.templateId || null,
              content: `Sent reminder template: ${templateName}`,
              status: 'sent',
              deduplicationHash,
              metadata: {
                ruleId: rule.id,
                eventSource: rule.eventSource,
                entityId,
              },
            })

            const components = buildReminderTemplateComponents({
              templateName,
              row,
            })

            await whatsappDispatchService.enqueueTemplateReminder({
              organizationId: orgId,
              messageId: message.id,
              conversationId: conversation.id,
              endpoint,
              to: phone,
              templateName,
              components,
              idempotencyKey: deduplicationHash,
            })

            totalEnqueued++
          } catch (e: any) {
            errors.push(`Failed to dispatch for entity ${entityId}: ${e.message}`)
            totalSkipped++
          }
        }
      }

    return {
      scheduledDate,
      totalEvaluated,
      totalEnqueued,
      totalSkipped,
      totalAlreadySent,
      errors,
    }
  }

  const dispatchInstallmentReminder = async (
    installmentId: string,
    options?: { forceResend?: boolean; scheduledDate?: string; organizationId?: string },
  ): Promise<InstallmentReminderResult> => {
    const orgId = options?.organizationId || organizationId
    const scheduledDate = options?.scheduledDate || getTodayArgentina()

    const activeRules = await reminderRulesService.getActiveRules(orgId)
    const rule = activeRules.find(r => r.eventSource === 'installment_due' || !r.eventSource)
    if (!rule) {
      throw new NoActiveReminderRuleError('No existe regla de recordatorio activa para la cuota')
    }

    const client = getClient(db)
    let rows: any[] = []
    
    if (typeof client?.select === 'function') {
      const queryRes = client
        .select()
        .from(vDueInstallments)
        .where(
          and(
            eq(vDueInstallments.organizationId, orgId),
            eq(vDueInstallments.installmentId, installmentId)
          ),
        )
      rows = (await queryRes) || []
    } else if (typeof client?.prepare === 'function') {
      const res = await client
        .prepare(`SELECT * FROM v_due_installments WHERE organizationId = ? AND (installmentId = ? OR id = ?)`)
        .bind(orgId, installmentId, installmentId)
        .all()
      rows = res.results || []
    }

    if (!rows.length) {
      throw new ReminderInstallmentNotFoundError('Cuota no encontrada o perteneciente a otra organización')
    }
    const row = rows[0]
    const actualInstallmentId = row.installmentId || row.id

    const rawDb = (client as any)?.prepare ? client : (db?.db ?? db)
    if ((!row.insuredId || row.insuredId === actualInstallmentId) && row.policyId && typeof rawDb?.prepare === 'function') {
      try {
        const polRow: any = await rawDb.prepare('SELECT insuredId FROM policies WHERE id = ?').bind(row.policyId).first()
        if (polRow?.insuredId) {
          row.insuredId = polRow.insuredId
        }
      } catch {}
    }

    const hashString = `${orgId}:${rule.id}:${actualInstallmentId}:${scheduledDate}`
    const encoder = new TextEncoder()
    const data = encoder.encode(hashString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const deduplicationHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    if (!options?.forceResend && await messagesService.isAlreadySent(deduplicationHash)) {
      throw new ReminderAlreadySentError('Recordatorio ya enviado en la fecha (requiere forceResend: true)')
    }

    let endpoint: any = null
    try {
      endpoint = await channelEndpointsService.resolveWhatsAppEndpointAndCredentials(orgId)
    } catch {
      endpoint = null
    }

    const isOptedOut = Boolean(row.isOptedOut) || (consentsService ? await consentsService.isInsuredOptedOut(row.insuredId, 'billing') : false)
    const phone = row.insuredPhone || row.phone

    let skipReason: string | null = null
    if (isOptedOut) skipReason = 'opt_out'
    else if (!phone) skipReason = 'missing_phone'
    else if (!endpoint) skipReason = 'no_endpoint'

    if (skipReason) {
      let message = null
      try {
        if (typeof conversationsService?.getOrCreateActiveConversation === 'function') {
          const conversation = await conversationsService.getOrCreateActiveConversation({
            organizationId: orgId,
            organizationChannelEndpointId: endpoint?.organizationChannelEndpointId,
            insuredId: row.insuredId,
            type: 'reminder',
          })
          if (conversation?.id) {
            if (typeof conversationsService?.linkEntityToConversation === 'function') {
              await conversationsService.linkEntityToConversation(conversation.id, {
                policyId: row.policyId,
                installmentId: actualInstallmentId,
                insuredId: row.insuredId,
              })
            }
            if (typeof messagesService?.recordOutboundMessage === 'function') {
              message = await messagesService.recordOutboundMessage({
                organizationId: orgId,
                conversationId: conversation.id,
                content: 'skipped reminder',
                status: 'skipped',
                skipReason,
                deduplicationHash,
                metadata: {
                  ruleId: rule.id,
                  eventSource: rule.eventSource,
                  entityId: actualInstallmentId,
                },
              })
            }
          }
        }
      } catch {}
      
      return {
        installmentId: actualInstallmentId,
        ruleId: rule.id,
        deduplicationHash,
        status: 'skipped',
        messageId: message?.id ?? null,
        skipReason
      }
    }

    const conversation = await conversationsService.getOrCreateActiveConversation({
      organizationId: orgId,
      organizationChannelEndpointId: endpoint.organizationChannelEndpointId,
      insuredId: row.insuredId,
      type: 'reminder',
    })

    await conversationsService.linkEntityToConversation(conversation.id, {
      policyId: row.policyId,
      installmentId: actualInstallmentId,
      insuredId: row.insuredId,
    })

    const templateName = (rule as any).templateName || rule.templateId || 'reminder_default'

    const message = await messagesService.recordOutboundMessage({
      organizationId: orgId,
      conversationId: conversation.id,
      templateId: rule.templateId || null,
      content: `Sent reminder template: ${templateName}`,
      status: 'sent',
      deduplicationHash,
      metadata: {
        ruleId: rule.id,
        eventSource: rule.eventSource,
        entityId: actualInstallmentId,
      },
    })

    const components = buildReminderTemplateComponents({
      templateName,
      row,
    })

    await whatsappDispatchService.enqueueTemplateReminder({
      organizationId: orgId,
      messageId: message.id,
      conversationId: conversation.id,
      endpoint,
      to: phone,
      templateName,
      components,
      idempotencyKey: options?.forceResend ? `${deduplicationHash}-resend-${Date.now()}` : deduplicationHash,
    })

    return {
      installmentId: actualInstallmentId,
      ruleId: rule.id,
      deduplicationHash,
      status: 'enqueued',
      messageId: message.id,
      skipReason: null
    }
  }

  return {
    getDueRemindersPreviewFromView,
    getDueRemindersPreview,
    dispatchDueRemindersFromView,
    dispatchDueRemindersForOrg,
    dispatchInstallmentReminder,
  }
}

export type RemindersOrchestratorService = ReturnType<typeof createRemindersOrchestratorService>
