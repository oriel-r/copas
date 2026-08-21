import { act, render, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEMO_SESSION,
  RealSessionSync,
  signInSocial,
  signOut,
  useSession,
  useSessionStore,
} from './session'

const authMocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  social: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('./auth-client', () => ({
  authClient: {
    useSession: authMocks.useSession,
    signIn: { social: authMocks.social },
    signOut: authMocks.signOut,
  },
}))

const probeMocks = vi.hoisted(() => ({
  probeBackend: vi.fn(),
}))

vi.mock('./backend', () => ({
  probeBackend: probeMocks.probeBackend,
}))

function resetStore() {
  useSessionStore.setState({ status: 'checking', demoSession: null, realSession: null })
}

describe('session port', () => {
  beforeEach(() => {
    resetStore()
    authMocks.useSession.mockReset()
    authMocks.social.mockReset()
    authMocks.signOut.mockReset()
    authMocks.social.mockResolvedValue({ error: null })
    authMocks.signOut.mockResolvedValue({ error: null })
    probeMocks.probeBackend.mockReset()
  })

  it('reports a pending state while checking the backend', () => {
    useSessionStore.setState({ status: 'checking' })

    const { result } = renderHook(() => useSession())

    expect(result.current).toEqual({ data: null, isPending: true, error: null })
  })

  it('goes online when the backend is reachable', async () => {
    probeMocks.probeBackend.mockResolvedValue(true)

    await act(() => useSessionStore.getState().probe())

    expect(useSessionStore.getState().status).toBe('online')
    expect(useSessionStore.getState().demoSession).toBeNull()
  })

  it('falls back to demo mode when the backend is unreachable in dev', async () => {
    probeMocks.probeBackend.mockResolvedValue(false)

    await act(() => useSessionStore.getState().probe())

    expect(useSessionStore.getState().status).toBe('offline')
    expect(useSessionStore.getState().demoSession).toEqual(DEMO_SESSION)
  })

  it('returns the demo session in offline mode', async () => {
    useSessionStore.setState({ status: 'offline', demoSession: DEMO_SESSION })

    const { result } = renderHook(() => useSession())

    expect(result.current).toEqual({ data: DEMO_SESSION, isPending: false, error: null })
  })

  it('returns the real session in online mode', () => {
    const realSession = { data: DEMO_SESSION, isPending: false, error: null }
    useSessionStore.setState({ status: 'online', realSession })

    const { result } = renderHook(() => useSession())

    expect(result.current).toEqual(realSession)
  })

  it('syncs the real session into the store', async () => {
    const session = { user: { id: 'user-1' }, session: { id: 'session-1' } }
    authMocks.useSession.mockReturnValue({ data: session, isPending: false, error: null })

    render(<RealSessionSync />)

    await waitFor(() => {
      expect(useSessionStore.getState().realSession?.data).toEqual(session)
    })
  })

  it('signs in as the demo user in offline mode', async () => {
    useSessionStore.setState({ status: 'offline', demoSession: null })

    const result = await signInSocial('google', 'http://localhost/dashboard')

    expect(result.error).toBeNull()
    expect(useSessionStore.getState().demoSession).toEqual(DEMO_SESSION)
    expect(authMocks.social).not.toHaveBeenCalled()
  })

  it('signs out the demo user in offline mode', async () => {
    useSessionStore.setState({ status: 'offline', demoSession: DEMO_SESSION })

    const result = await signOut()

    expect(result.error).toBeNull()
    expect(useSessionStore.getState().demoSession).toBeNull()
    expect(authMocks.signOut).not.toHaveBeenCalled()
  })

  it('delegates social sign-in to the auth client in online mode', async () => {
    useSessionStore.setState({ status: 'online' })

    await signInSocial('microsoft', 'http://localhost/dashboard')

    expect(authMocks.social).toHaveBeenCalledWith({
      provider: 'microsoft',
      callbackURL: 'http://localhost/dashboard',
    })
  })

  it('delegates sign-out to the auth client in online mode', async () => {
    useSessionStore.setState({ status: 'online' })

    await signOut()

    expect(authMocks.signOut).toHaveBeenCalledOnce()
  })
})