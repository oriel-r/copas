import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ReminderDispatchSummary,
  InstallmentReminderResult,
  ReminderExecutionParams,
  InstallmentReminderParams,
} from '@copas/contracts'
import { apiClient } from '../api-client'
import { isDemoMode } from '../session'
import { ApiError } from './api-error'

export interface UseDispatchDueRemindersOptions {
  onSuccess?: (summary: ReminderDispatchSummary) => void
  onError?: (error: Error) => void
}

export interface UseDispatchDueRemindersReturn {
  dispatchDueReminders: (params?: ReminderExecutionParams) => Promise<ReminderDispatchSummary>
  isDispatching: boolean
  error: Error | null
}

/**
 * Hook para disparar la ejecución en lote de recordatorios del día.
 */
export function useDispatchDueReminders(
  options?: UseDispatchDueRemindersOptions,
): UseDispatchDueRemindersReturn {
  const queryClient = useQueryClient()

  const mutation = useMutation<ReminderDispatchSummary, Error, ReminderExecutionParams | void>({
    mutationFn: async (params) => {
      if (isDemoMode()) {
        return {
          scheduledDate: params?.scheduledDate ?? new Date().toISOString().split('T')[0],
          totalEvaluated: 10,
          totalEnqueued: 8,
          totalSkipped: 1,
          totalAlreadySent: 1,
          errors: [],
        } as ReminderDispatchSummary
      }

      const res = await apiClient.reminders.executions.$post({ json: params ?? {} })
      if (!res.ok) {
        throw await ApiError.fromResponse(res as unknown as Response)
      }
      return (await res.json()) as unknown as ReminderDispatchSummary
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] })
      options?.onSuccess?.(data)
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })

  return {
    dispatchDueReminders: (params?: ReminderExecutionParams) => mutation.mutateAsync(params),
    isDispatching: mutation.isPending,
    error: mutation.error,
  }
}

export interface UseDispatchInstallmentReminderOptions {
  onSuccess?: (result: InstallmentReminderResult) => void
  onError?: (error: Error & { status?: number }) => void
}

export interface UseDispatchInstallmentReminderReturn {
  dispatchInstallmentReminder: (
    installmentId: string,
    params?: InstallmentReminderParams | boolean,
  ) => Promise<InstallmentReminderResult>
  isDispatching: (installmentId: string) => boolean
  error: Error | null
}

/**
 * Hook para disparar el recordatorio individual de una cuota vía WhatsApp.
 */
export function useDispatchInstallmentReminder(
  options?: UseDispatchInstallmentReminderOptions,
): UseDispatchInstallmentReminderReturn {
  const queryClient = useQueryClient()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const mutation = useMutation<
    InstallmentReminderResult,
    Error & { status?: number },
    { id: string; params?: InstallmentReminderParams }
  >({
    mutationFn: async ({ id, params }) => {
      if (isDemoMode()) {
        return {
          installmentId: id,
          ruleId: 'mock-rule',
          deduplicationHash: 'mock-sha',
          status: 'enqueued',
          messageId: 'mock-msg',
        } as InstallmentReminderResult
      }

      const res = await apiClient.reminders.installments[':id'].$post({
        param: { id },
        json: {
          forceResend: params?.forceResend ?? false,
          scheduledDate: params?.scheduledDate,
        },
      })
      if (!res.ok) {
        throw await ApiError.fromResponse(res as unknown as Response)
      }
      return (await res.json()) as unknown as InstallmentReminderResult
    },
    onMutate: ({ id }) => {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
    },
    onSettled: (_data, _error, { id }) => {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      options?.onSuccess?.(data)
    },
    onError: (error) => {
      options?.onError?.(error)
    },
  })

  return {
    dispatchInstallmentReminder: (installmentId: string, params?: InstallmentReminderParams | boolean) => {
      const actualParams = typeof params === 'boolean' ? { forceResend: params } : params
      return mutation.mutateAsync({ id: installmentId, params: actualParams })
    },
    isDispatching: (installmentId: string) => pendingIds.has(installmentId),
    error: mutation.error,
  }
}
