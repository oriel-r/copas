import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
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
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
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

  it('renders the sign in and sign up OAuth options on /login', async () => {
    const user = userEvent.setup()
    renderApp(['/login'])

    expect(screen.getByRole('tab', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Sign up' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar con Microsoft' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Sign up' }))
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument()
  })

  it('redirects unauthenticated users from /app to /login', () => {
    renderApp(['/app'])

    expect(screen.getByRole('tab', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('redirects authenticated users from /login to /app', () => {
    authMocks.useSession.mockReturnValue(authenticatedSession())
    renderApp(['/login'])

    expect(screen.getByText('Hola!')).toBeInTheDocument()
  })

  it('redirects the root path to the dashboard', () => {
    authMocks.useSession.mockReturnValue(authenticatedSession())
    renderApp(['/'])

    expect(screen.getByText('Hola!')).toBeInTheDocument()
  })

  it('shows a not found page for unknown routes', () => {
    renderApp(['/ruta-inexistente'])

    expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
  })

  it('starts OAuth with the selected provider', async () => {
    const user = userEvent.setup()
    renderApp(['/login'])

    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }))

    expect(authMocks.social).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: window.location.origin,
    })
  })

  it('shows the authenticated page and signs out', async () => {
    const user = userEvent.setup()
    authMocks.useSession.mockReturnValue(authenticatedSession())
    renderApp(['/app'])

    expect(screen.getByText('Hola!')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(authMocks.signOut).toHaveBeenCalledOnce()
  })

  it('displays OAuth errors', async () => {
    const user = userEvent.setup()
    authMocks.social.mockResolvedValue({ error: { message: 'OAuth falló' } })
    renderApp(['/login'])

    await user.click(screen.getByRole('button', { name: 'Continuar con Microsoft' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('OAuth falló')
  })

  it('shows a loading state while the session is pending', () => {
    authMocks.useSession.mockReturnValue({ data: null, isPending: true, error: null })
    renderApp(['/app'])

    expect(screen.getByLabelText('Cargando sesión')).toBeInTheDocument()
  })
})
