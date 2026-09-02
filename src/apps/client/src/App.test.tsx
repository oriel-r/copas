import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSessionStore } from './lib/session'
import App from './App'

const authMocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useListOrganizations: vi.fn(),
  social: vi.fn(),
  signOut: vi.fn(),
  organizationList: vi.fn(),
  organizationSetActive: vi.fn(),
  organizationCreate: vi.fn(),
}))

vi.mock('./lib/auth-client', () => ({
  authClient: {
    useSession: authMocks.useSession,
    useListOrganizations: authMocks.useListOrganizations,
    signIn: { social: authMocks.social },
    signOut: authMocks.signOut,
    organization: {
      list: authMocks.organizationList,
      setActive: authMocks.organizationSetActive,
      create: authMocks.organizationCreate,
    },
  },
}))

vi.mock('./lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/session')>()
  return {
    ...actual,
    useSession: authMocks.useSession,
    signInSocial: (provider: string, callbackURL: string) => authMocks.social({ provider, callbackURL }),
    signOut: () => authMocks.signOut(),
  }
})

function renderApp(initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function authenticatedSession() {
  return {
    data: { user: { id: 'user-1' }, session: { id: 'session-1' } },
    isPending: false,
    error: null,
  }
}

function setAuthenticatedSession() {
  const session = authenticatedSession()
  authMocks.useSession.mockReturnValue(session)
  useSessionStore.setState({ status: 'online', realSession: session, demoSession: null })
  return session
}

function setUnauthenticatedSession() {
  const session = { data: null, isPending: false, error: null }
  authMocks.useSession.mockReturnValue(session)
  useSessionStore.setState({ status: 'online', realSession: session, demoSession: null })
  return session
}

function setPendingSession() {
  const session = { data: null, isPending: true, error: null }
  authMocks.useSession.mockReturnValue(session)
  useSessionStore.setState({ status: 'online', realSession: session, demoSession: null })
  return session
}

async function waitForLoadingToFinish() {
  const loader = screen.queryByLabelText('Cargando sesión')
  if (loader) {
    await waitForElementToBeRemoved(loader, { timeout: 5000 })
  }
}

describe('App', () => {
  beforeEach(() => {
    setUnauthenticatedSession()
    authMocks.useListOrganizations.mockReset()
    authMocks.social.mockReset()
    authMocks.signOut.mockReset()
    authMocks.organizationList.mockReset()
    authMocks.organizationSetActive.mockReset()
    authMocks.organizationCreate.mockReset()

    authMocks.useListOrganizations.mockReturnValue({
      data: [{ id: 'org-1', name: 'My Agency' }],
      isPending: false,
      error: null,
    })
    authMocks.social.mockResolvedValue({ error: null })
    authMocks.signOut.mockResolvedValue({ error: null })
    authMocks.organizationList.mockResolvedValue({ data: [], error: null })
    authMocks.organizationSetActive.mockResolvedValue({ data: null, error: null })
    authMocks.organizationCreate.mockResolvedValue({ data: null, error: null })
  })

  it('renders the OAuth options on /login', async () => {
    userEvent.setup()
    setUnauthenticatedSession()
    renderApp(['/login'])

    await waitForLoadingToFinish()
    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument(),
      { timeout: 5000 },
    )
    expect(screen.getByRole('button', { name: 'Continuar con Microsoft' })).toBeInTheDocument()
  })

  it('redirects unauthenticated users from /app to /login', async () => {
    setUnauthenticatedSession()
    renderApp(['/app'])

    await waitForLoadingToFinish()
    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument(),
      { timeout: 5000 },
    )
  })

  it('redirects unauthenticated users from /onboarding to /login', async () => {
    setUnauthenticatedSession()
    renderApp(['/onboarding'])

    await waitForLoadingToFinish()
    await waitFor(
      () => expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument(),
      { timeout: 5000 },
    )
  })

  it('redirects authenticated users from /login to /app', async () => {
    setAuthenticatedSession()
    renderApp(['/login'])

    await waitForLoadingToFinish()
    await waitFor(() => expect(screen.getByText('Hola!')).toBeInTheDocument(), { timeout: 5000 })
  })

  it('redirects the root path to the dashboard', async () => {
    setAuthenticatedSession()
    renderApp(['/'])

    await waitForLoadingToFinish()
    await waitFor(() => expect(screen.getByText('Hola!')).toBeInTheDocument(), { timeout: 5000 })
  })

  it('shows a not found page for unknown routes', async () => {
    setUnauthenticatedSession()
    renderApp(['/ruta-inexistente'])

    await waitForLoadingToFinish()
    await waitFor(() => expect(screen.getByText('Página no encontrada')).toBeInTheDocument(), { timeout: 5000 })
  })

  it('starts OAuth with the selected provider', async () => {
    const user = userEvent.setup()
    setUnauthenticatedSession()
    renderApp(['/login'])

    await waitForLoadingToFinish()
    const googleBtn = await screen.findByRole('button', { name: 'Continuar con Google' }, { timeout: 5000 })
    await user.click(googleBtn)

    expect(authMocks.social).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: `${window.location.origin}/dashboard`,
    })
  })

  it('shows the authenticated page and signs out', async () => {
    const user = userEvent.setup()
    setAuthenticatedSession()
    renderApp(['/app'])

    await waitForLoadingToFinish()
    await waitFor(() => expect(screen.getByText('Hola!')).toBeInTheDocument(), { timeout: 5000 })
    const signOutBtn = screen.getByRole('button', { name: 'Cerrar sesión' })
    await user.click(signOutBtn)

    expect(authMocks.signOut).toHaveBeenCalledOnce()
  })

  it('displays OAuth errors', async () => {
    const user = userEvent.setup()
    setUnauthenticatedSession()
    authMocks.social.mockResolvedValue({ error: { message: 'OAuth falló' } })
    renderApp(['/login'])

    await waitForLoadingToFinish()
    const msBtn = await screen.findByRole('button', { name: 'Continuar con Microsoft' }, { timeout: 5000 })
    await user.click(msBtn)

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent('OAuth falló')
  })

  it('shows a loading state while the session is pending', () => {
    setPendingSession()
    renderApp(['/app'])

    expect(screen.getByLabelText('Cargando sesión')).toBeInTheDocument()
  })

  describe('Agency Onboarding Router Integration', () => {
    it('redirects authenticated user without agency from /dashboard to /onboarding', async () => {
      setAuthenticatedSession()
      authMocks.useListOrganizations.mockReturnValue({ data: [], isPending: false, error: null })

      renderApp(['/dashboard'])

      await waitForLoadingToFinish()
      await waitFor(
        () => {
          expect(screen.getByLabelText(/¿Cómo se llama tu agencia\?/i)).toBeInTheDocument()
        },
        { timeout: 5000 },
      )
    })

    it('renders onboarding page for authenticated user without agency navigating to /onboarding', async () => {
      setAuthenticatedSession()
      authMocks.useListOrganizations.mockReturnValue({ data: [], isPending: false, error: null })

      renderApp(['/onboarding'])

      await waitForLoadingToFinish()
      await waitFor(
        () => {
          expect(screen.getByLabelText(/¿Cómo se llama tu agencia\?/i)).toBeInTheDocument()
        },
        { timeout: 5000 },
      )
    })
  })
})
