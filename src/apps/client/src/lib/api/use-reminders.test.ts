import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSessionStore, DEMO_SESSION } from '../session'
import {
  reminderDispatchSummarySchema,
  installmentReminderResultSchema,
  type ReminderDispatchSummary,
  type InstallmentReminderResult,
  type ReminderExecutionParams,
  type InstallmentReminderParams,
} from '@copas/contracts'
import * as RemindersModule from './use-reminders'

interface RemindersDueHookReturn {
  dispatchDueReminders?: (params?: ReminderExecutionParams) => Promise<ReminderDispatchSummary>
  mutateAsync?: (params?: ReminderExecutionParams) => Promise<ReminderDispatchSummary>
  isDispatching?: boolean
  isPending?: boolean
  isError?: boolean
  error?: unknown
}

interface RemindersInstallmentHookReturn {
  dispatchInstallmentReminder?: (
    installmentId: string,
    params?: InstallmentReminderParams | boolean,
  ) => Promise<InstallmentReminderResult>
  mutateAsync?: (
    installmentId: string,
    params?: InstallmentReminderParams | boolean,
  ) => Promise<InstallmentReminderResult>
  isDispatching: (installmentId: string) => boolean
  isPending?: boolean
  isError?: boolean
  error?: unknown
}

interface RemindersModuleExports {
  useDispatchDueReminders?: () => RemindersDueHookReturn
  useRemindersDueDispatch?: () => RemindersDueHookReturn
  useDispatchInstallmentReminder?: () => RemindersInstallmentHookReturn
  useInstallmentReminderDispatch?: () => RemindersInstallmentHookReturn
  default?: {
    useDispatchDueReminders?: () => RemindersDueHookReturn
    useDispatchInstallmentReminder?: () => RemindersInstallmentHookReturn
  }
}

const mod = RemindersModule as RemindersModuleExports

const useDispatchDueReminders =
  mod.useDispatchDueReminders ??
  mod.useRemindersDueDispatch ??
  mod.default?.useDispatchDueReminders ??
  (() => {
    throw new Error('useDispatchDueReminders is not exported')
  })

const useDispatchInstallmentReminder =
  mod.useDispatchInstallmentReminder ??
  mod.useInstallmentReminderDispatch ??
  mod.default?.useDispatchInstallmentReminder ??
  (() => {
    throw new Error('useDispatchInstallmentReminder is not exported')
  })

const mockDispatchSummary: ReminderDispatchSummary = {
  scheduledDate: '2026-09-23',
  totalEvaluated: 12,
  totalEnqueued: 10,
  totalSkipped: 2,
  totalAlreadySent: 0,
  errors: [],
  results: [
    {
      organizationId: 'org-1',
      ruleId: 'rule-1',
      eventSource: 'installment_due',
      entityId: 'inst-1',
      deduplicationHash: 'hash-1',
      status: 'enqueued',
      messageId: 'msg-1',
    },
    {
      organizationId: 'org-1',
      ruleId: 'rule-1',
      eventSource: 'installment_due',
      entityId: 'inst-2',
      deduplicationHash: 'hash-2',
      status: 'skipped',
      skipReason: 'missing_phone',
    },
  ],
}

const mockInstallmentResult: InstallmentReminderResult = {
  installmentId: 'inst-1',
  ruleId: 'rule-1',
  deduplicationHash: 'hash-1',
  status: 'enqueued',
  messageId: 'msg-1',
  skipReason: null,
}

type SessionStoreState = Parameters<typeof useSessionStore.setState>[0]

function setOnlineSession() {
  useSessionStore.setState({
    status: 'online',
    demoSession: null,
    realSession: {
      data: {
        user: { id: 'usr-1', email: 'test@example.com' },
        session: { id: 'ses-1', activeOrganizationId: 'org-1' },
      },
      isPending: false,
      error: null,
    } as unknown as NonNullable<SessionStoreState['realSession']>,
  })
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

interface ErrorWithStatus {
  status?: number
  statusCode?: number
  code?: string
  name?: string
  message?: string
}

describe('use-reminders API hooks', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createQueryClient()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    useSessionStore.setState({ status: 'checking', demoSession: null, realSession: null })
  })

  describe('useDispatchDueReminders (Batch Dispatch)', () => {
    describe('Given Connected / Online Mode', () => {
      beforeEach(() => {
        setOnlineSession()
      })

      it('R-01: should dispatch batch reminders, return ReminderDispatchSummary and invalidate installments cache', async () => {
        fetchMock.mockResolvedValueOnce(
          new Response(JSON.stringify(mockDispatchSummary), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useDispatchDueReminders(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current).toBeDefined()
        const dispatchFn = result.current.dispatchDueReminders ?? result.current.mutateAsync
        expect(typeof dispatchFn).toBe('function')

        let res: ReminderDispatchSummary | undefined
        await act(async () => {
          res = await dispatchFn!()
        })

        expect(res).toEqual(mockDispatchSummary)
        const validation = reminderDispatchSummarySchema.safeParse(res)
        expect(validation.success).toBe(true)

        // Verify API endpoint called
        const batchCall = fetchMock.mock.calls.find(([url]) =>
          typeof url === 'string' && url.includes('/reminders/executions'),
        )
        expect(batchCall).toBeDefined()
        const [, init] = batchCall as [string, RequestInit]
        expect(init?.method).toBe('POST')

        // Verify query cache invalidation for installments
        expect(invalidateQueriesSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: expect.arrayContaining(['installments']) }),
        )
      })

      it('R-02: should send explicit scheduledDate in request body when provided', async () => {
        fetchMock.mockResolvedValueOnce(
          new Response(JSON.stringify(mockDispatchSummary), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const { result } = renderHook(() => useDispatchDueReminders(), {
          wrapper: createWrapper(queryClient),
        })

        const dispatchFn = result.current.dispatchDueReminders ?? result.current.mutateAsync

        await act(async () => {
          await dispatchFn!({ scheduledDate: '2026-09-25' })
        })

        const batchCall = fetchMock.mock.calls.find(([url]) =>
          typeof url === 'string' && url.includes('/reminders/executions'),
        )
        expect(batchCall).toBeDefined()
        const [, init] = batchCall as [string, RequestInit]
        expect(init?.method).toBe('POST')
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body
        expect(body).toEqual(expect.objectContaining({ scheduledDate: '2026-09-25' }))
      })

      it('R-03: should handle API error (500 / 401), reject mutation and avoid cache invalidation', async () => {
        fetchMock.mockResolvedValueOnce(
          new Response(
            JSON.stringify({ message: 'Internal Server Error' }),
            {
              status: 500,
              statusText: 'Internal Server Error',
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )

        const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useDispatchDueReminders(), {
          wrapper: createWrapper(queryClient),
        })

        const dispatchFn = result.current.dispatchDueReminders ?? result.current.mutateAsync

        let caughtError: unknown = null
        await act(async () => {
          try {
            await dispatchFn!()
          } catch (err) {
            caughtError = err
          }
        })

        expect(caughtError).toBeDefined()
        await waitFor(() => {
          expect(result.current.isError || result.current.error !== null).toBe(true)
        })
        expect(invalidateQueriesSpy).not.toHaveBeenCalled()
      })
    })

    describe('Given Offline / Demo Mode', () => {
      beforeEach(() => {
        useSessionStore.setState({
          status: 'offline',
          demoSession: DEMO_SESSION,
          realSession: null,
        })
      })

      it('R-04: should return valid mock ReminderDispatchSummary in demo mode without network calls', async () => {
        const { result } = renderHook(() => useDispatchDueReminders(), {
          wrapper: createWrapper(queryClient),
        })

        const dispatchFn = result.current.dispatchDueReminders ?? result.current.mutateAsync

        let res: ReminderDispatchSummary | undefined
        await act(async () => {
          res = await dispatchFn!()
        })

        expect(res).toBeDefined()
        const validation = reminderDispatchSummarySchema.safeParse(res)
        expect(validation.success).toBe(true)
        expect(res!.totalEvaluated).toBeGreaterThanOrEqual(0)
        expect(res!.totalEnqueued).toBeGreaterThanOrEqual(0)

        // Verify no network calls were made
        const reminderCalls = fetchMock.mock.calls.filter(([url]) =>
          typeof url === 'string' && url.includes('/reminders/executions'),
        )
        expect(reminderCalls).toHaveLength(0)
      })
    })
  })

  describe('useDispatchInstallmentReminder (Individual Dispatch)', () => {
    describe('Given Connected / Online Mode', () => {
      beforeEach(() => {
        setOnlineSession()
      })

      it('R-05: should dispatch individual reminder with forceResend: false, return InstallmentReminderResult and invalidate cache', async () => {
        fetchMock.mockResolvedValueOnce(
          new Response(JSON.stringify(mockInstallmentResult), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useDispatchInstallmentReminder(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current).toBeDefined()
        const dispatchFn = result.current.dispatchInstallmentReminder ?? result.current.mutateAsync
        expect(typeof dispatchFn).toBe('function')

        let res: InstallmentReminderResult | undefined
        await act(async () => {
          res = await dispatchFn!('inst-1')
        })

        expect(res).toEqual(mockInstallmentResult)
        const validation = installmentReminderResultSchema.safeParse(res)
        expect(validation.success).toBe(true)

        // Verify API endpoint called
        const singleCall = fetchMock.mock.calls.find(([url]) =>
          typeof url === 'string' && url.includes('/reminders/installments/inst-1'),
        )
        expect(singleCall).toBeDefined()
        const [, init] = singleCall as [string, RequestInit]
        expect(init?.method).toBe('POST')

        // Verify invalidation
        expect(invalidateQueriesSpy).toHaveBeenCalledWith(
          expect.objectContaining({ queryKey: expect.arrayContaining(['installments']) }),
        )
      })

      it('R-06: should dispatch individual reminder with forceResend: true when requested', async () => {
        fetchMock.mockResolvedValueOnce(
          new Response(JSON.stringify(mockInstallmentResult), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const { result } = renderHook(() => useDispatchInstallmentReminder(), {
          wrapper: createWrapper(queryClient),
        })

        const dispatchFn = result.current.dispatchInstallmentReminder ?? result.current.mutateAsync

        await act(async () => {
          await dispatchFn!('inst-1', { forceResend: true })
        })

        const singleCall = fetchMock.mock.calls.find(([url]) =>
          typeof url === 'string' && url.includes('/reminders/installments/inst-1'),
        )
        expect(singleCall).toBeDefined()
        const [, init] = singleCall as [string, RequestInit]
        expect(init?.method).toBe('POST')
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body
        expect(body).toEqual(expect.objectContaining({ forceResend: true }))
      })

      it('R-06b: should accept boolean true directly as second argument for forceResend', async () => {
        fetchMock.mockResolvedValueOnce(
          new Response(JSON.stringify(mockInstallmentResult), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const { result } = renderHook(() => useDispatchInstallmentReminder(), {
          wrapper: createWrapper(queryClient),
        })

        const dispatchFn = result.current.dispatchInstallmentReminder ?? result.current.mutateAsync

        await act(async () => {
          await dispatchFn!('inst-1', true as unknown as InstallmentReminderParams)
        })

        const singleCall = fetchMock.mock.calls.find(([url]) =>
          typeof url === 'string' && url.includes('/reminders/installments/inst-1'),
        )
        expect(singleCall).toBeDefined()
        const [, init] = singleCall as [string, RequestInit]
        const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body
        expect(body).toEqual(expect.objectContaining({ forceResend: true }))
      })

      it('R-07: should propagate error with status 409 when reminder was already sent today', async () => {
        fetchMock.mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: 'ALREADY_SENT',
              message: 'Recordatorio ya enviado en la fecha (requiere forceResend: true)',
            }),
            {
              status: 409,
              statusText: 'Conflict',
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )

        const { result } = renderHook(() => useDispatchInstallmentReminder(), {
          wrapper: createWrapper(queryClient),
        })

        const dispatchFn = result.current.dispatchInstallmentReminder ?? result.current.mutateAsync

        let caughtError: unknown = null
        await act(async () => {
          try {
            await dispatchFn!('inst-1')
          } catch (err) {
            caughtError = err
          }
        })

        expect(caughtError).toBeDefined()
        const err = caughtError as ErrorWithStatus | null
        const isConflict =
          err?.status === 409 ||
          err?.statusCode === 409 ||
          err?.code === 'ALREADY_SENT' ||
          err?.name === 'ReminderAlreadySentError' ||
          err?.message?.includes('ya enviado')
        expect(isConflict).toBe(true)
      })

      it('R-08: should propagate error when API responds with 422 Unprocessable Entity (no active rule)', async () => {
        fetchMock.mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: 'NO_ACTIVE_RULE',
              message: 'No existe regla de recordatorio activa para la cuota',
            }),
            {
              status: 422,
              statusText: 'Unprocessable Entity',
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )

        const { result } = renderHook(() => useDispatchInstallmentReminder(), {
          wrapper: createWrapper(queryClient),
        })

        const dispatchFn = result.current.dispatchInstallmentReminder ?? result.current.mutateAsync

        let caughtError: unknown = null
        await act(async () => {
          try {
            await dispatchFn!('inst-1')
          } catch (err) {
            caughtError = err
          }
        })

        expect(caughtError).toBeDefined()
        const err = caughtError as ErrorWithStatus | null
        const is422 =
          err?.status === 422 ||
          err?.statusCode === 422 ||
          err?.code === 'NO_ACTIVE_RULE' ||
          err?.name === 'NoActiveReminderRuleError' ||
          err?.message?.includes('regla de recordatorio')
        expect(is422).toBe(true)
      })

      it('R-09: should maintain granular isDispatching state isolated per installmentId', async () => {
        let resolveFetch: (res: Response) => void = () => {}
        fetchMock.mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              resolveFetch = resolve
            }),
        )

        const { result } = renderHook(() => useDispatchInstallmentReminder(), {
          wrapper: createWrapper(queryClient),
        })

        expect(typeof result.current.isDispatching).toBe('function')
        expect(result.current.isDispatching('inst-1')).toBe(false)
        expect(result.current.isDispatching('inst-2')).toBe(false)

        const dispatchFn = result.current.dispatchInstallmentReminder ?? result.current.mutateAsync

        let promise: Promise<InstallmentReminderResult | undefined>
        act(() => {
          promise = dispatchFn!('inst-1')
        })

        await waitFor(() => {
          expect(result.current.isDispatching('inst-1')).toBe(true)
          expect(result.current.isDispatching('inst-2')).toBe(false)
        })

        await act(async () => {
          resolveFetch(
            new Response(JSON.stringify(mockInstallmentResult), {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
          await promise
        })

        await waitFor(() => {
          expect(result.current.isDispatching('inst-1')).toBe(false)
          expect(result.current.isDispatching('inst-2')).toBe(false)
        })
      })
    })

    describe('Given Offline / Demo Mode', () => {
      beforeEach(() => {
        useSessionStore.setState({
          status: 'offline',
          demoSession: DEMO_SESSION,
          realSession: null,
        })
      })

      it('R-10: should return valid mock InstallmentReminderResult with status enqueued without network calls', async () => {
        const { result } = renderHook(() => useDispatchInstallmentReminder(), {
          wrapper: createWrapper(queryClient),
        })

        const dispatchFn = result.current.dispatchInstallmentReminder ?? result.current.mutateAsync

        let res: InstallmentReminderResult | undefined
        await act(async () => {
          res = await dispatchFn!('inst-demo-1')
        })

        expect(res).toBeDefined()
        expect(res?.status).toBe('enqueued')
        expect(res?.installmentId).toBe('inst-demo-1')
        const validation = installmentReminderResultSchema.safeParse(res)
        expect(validation.success).toBe(true)

        const reminderCalls = fetchMock.mock.calls.filter(([url]) =>
          typeof url === 'string' && url.includes('/reminders/installments'),
        )
        expect(reminderCalls).toHaveLength(0)
      })
    })
  })
})
