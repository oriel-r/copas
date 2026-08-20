import { useEffect } from 'react'
import { create } from 'zustand'
import { authClient } from '@/lib/auth-client'
import { probeBackend } from '@/lib/backend'

export type OAuthProvider = 'google' | 'microsoft'

export type SessionData = {
  user: {
    id: string
    name: string
    email: string
    image?: string | null
  }
  session: {
    id: string
  }
}

export type SessionError = { message?: string } | null

export type SessionResult = {
  data: SessionData | null
  isPending: boolean
  error: SessionError
}

export const DEMO_SESSION: SessionData = {
  user: {
    id: 'demo-user',
    name: 'Usuario Demo',
    email: 'demo@copas.local',
  },
  session: {
    id: 'demo-session',
  },
}

type BackendStatus = 'checking' | 'online' | 'offline'

type SessionState = {
  status: BackendStatus
  demoSession: SessionData | null
  realSession: SessionResult | null
  probe: () => Promise<void>
  setDemoSession: (session: SessionData | null) => void
  setRealSession: (result: SessionResult | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'checking',
  demoSession: null,
  realSession: null,
  probe: async () => {
    const reachable = await probeBackend()
    const demo = !reachable && import.meta.env.DEV

    set({
      status: demo ? 'offline' : 'online',
      demoSession: demo ? DEMO_SESSION : null,
    })
  },
  setDemoSession: (session) => set({ demoSession: session }),
  setRealSession: (result) => set({ realSession: result }),
}))

export function useSession(): SessionResult {
  const status = useSessionStore((s) => s.status)
  const demoSession = useSessionStore((s) => s.demoSession)
  const realSession = useSessionStore((s) => s.realSession)

  if (status === 'checking') {
    return { data: null, isPending: true, error: null }
  }

  if (status === 'offline') {
    return { data: demoSession, isPending: false, error: null }
  }

  return realSession ?? { data: null, isPending: true, error: null }
}

export function isDemoMode(): boolean {
  return useSessionStore.getState().status === 'offline'
}

export function retryProbe(): void {
  void useSessionStore.getState().probe()
}

type SignInResult = { error: { message?: string } | null }

export async function signInSocial(provider: OAuthProvider, callbackURL: string): Promise<SignInResult> {
  if (useSessionStore.getState().status === 'offline') {
    useSessionStore.getState().setDemoSession(DEMO_SESSION)
    return { error: null }
  }

  return (await authClient.signIn.social({ provider, callbackURL })) as SignInResult
}

export async function signOut(): Promise<SignInResult> {
  if (useSessionStore.getState().status === 'offline') {
    useSessionStore.getState().setDemoSession(null)
    return { error: null }
  }

  return (await authClient.signOut()) as SignInResult
}

export function RealSessionSync() {
  const { data, isPending, error } = authClient.useSession()
  const setRealSession = useSessionStore((s) => s.setRealSession)

  useEffect(() => {
    setRealSession({
      data: (data ?? null) as SessionData | null,
      isPending,
      error: (error as SessionError) ?? null,
    })
  }, [data, isPending, error, setRealSession])

  return null
}