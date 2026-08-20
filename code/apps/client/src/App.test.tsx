import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

const authMocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  social: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('./lib/auth-client', () => ({
  authClient: {
    useSession: authMocks.useSession,
    signIn: { social: authMocks.social },
    signOut: authMocks.signOut,
  },
}))

function renderApp(initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

describe('App', () => {
  beforeEach(() => {
    authMocks.useSession.mockReset()
    authMocks.social.mockReset()
    authMocks.signOut.mockReset()
    authMocks.useSession.mockReturnValue({ data: null, isPending: false, error: null })
    authMocks.social.mockResolvedValue({ error: null })
    authMocks.signOut.mockResolvedValue({ error: null })
  })

  it('renders the OAuth options on /login', async () => {
    userEvent.setup()
    renderApp(['/login'])

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Continuar con Microsoft' })).toBeInTheDocument()
  })

  it('redirects unauthenticated users from /app to /login', async () => {
    renderApp(['/app'])

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument())
  })

  it('redirects authenticated users from /login to /app', async () => {
    authMocks.useSession.mockReturnValue(authenticatedSession())
    renderApp(['/login'])

    await waitFor(() => expect(screen.getByText('Hola!')).toBeInTheDocument())
  })

  it('redirects the root path to the dashboard', async () => {
    authMocks.useSession.mockReturnValue(authenticatedSession())
    renderApp(['/'])

    await waitFor(() => expect(screen.getByText('Hola!')).toBeInTheDocument())
  })

  it('shows a not found page for unknown routes', async () => {
    renderApp(['/ruta-inexistente'])

    await waitFor(() => expect(screen.getByText('Página no encontrada')).toBeInTheDocument())
  })

  it('starts OAuth with the selected provider', async () => {
    const user = userEvent.setup()
    renderApp(['/login'])

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }))

    expect(authMocks.social).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: `${window.location.origin}/dashboard`,
    })
  })

  it('shows the authenticated page and signs out', async () => {
    const user = userEvent.setup()
    authMocks.useSession.mockReturnValue(authenticatedSession())
    renderApp(['/app'])

    await waitFor(() => expect(screen.getByText('Hola!')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(authMocks.signOut).toHaveBeenCalledOnce()
  })

  it('displays OAuth errors', async () => {
    const user = userEvent.setup()
    authMocks.social.mockResolvedValue({ error: { message: 'OAuth falló' } })
    renderApp(['/login'])

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar con Microsoft' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Continuar con Microsoft' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('OAuth falló')
  })

  it('shows a loading state while the session is pending', () => {
    authMocks.useSession.mockReturnValue({ data: null, isPending: true, error: null })
    renderApp(['/app'])

    expect(screen.getByLabelText('Cargando sesión')).toBeInTheDocument()
  })
})
