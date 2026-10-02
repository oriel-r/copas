import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import * as NavbarModule from './navbar'

const mockSignOut = vi.fn().mockResolvedValue({ error: null })

vi.mock('../../lib/session', () => ({
  signOut: () => mockSignOut(),
  useSession: () => ({
    data: { user: { id: 'user-1', name: 'PAS Demo' }, session: { id: 'session-1' } },
    isPending: false,
    error: null,
  }),
  useSessionStore: {
    getState: () => ({ status: 'online', demoSession: null, realSession: null }),
  },
}))

vi.mock('../../lib/auth-client', () => ({
  authClient: {
    signOut: () => mockSignOut(),
  },
}))

const Navbar = (NavbarModule as any).Navbar ?? (NavbarModule as any).default

function renderNavbar(props: Record<string, any> = {}) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Navbar {...props} />
    </MemoryRouter>,
  )
}

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Branding', () => {
    it('should render the brand text or logo "CoPAS"', () => {
      renderNavbar()

      const brandElement = screen.getByText(/copas/i)
      expect(brandElement).toBeInTheDocument()
    })
  })

  describe('Navigation links', () => {
    it('should render a navigation link to "Inicio" pointing to /dashboard', () => {
      renderNavbar()

      const homeLink = screen.getByRole('link', { name: /inicio/i })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute('href', '/dashboard')
    })

    it('should render a navigation link to "Cartera" pointing to /cartera', () => {
      renderNavbar()

      const carteraLink = screen.getByRole('link', { name: /cartera/i })
      expect(carteraLink).toBeInTheDocument()
      expect(carteraLink).toHaveAttribute('href', '/cartera')
    })
  })

  describe('Sign Out Action', () => {
    it('should render the "Cerrar sesión" button', () => {
      renderNavbar()

      const signOutButton = screen.getByRole('button', { name: /cerrar sesión/i })
      expect(signOutButton).toBeInTheDocument()
    })

    it('should trigger sign out when clicking "Cerrar sesión"', async () => {
      const propSignOut = vi.fn()
      renderNavbar({ onSignOut: propSignOut })

      const signOutButton = screen.getByRole('button', { name: /cerrar sesión/i })
      fireEvent.click(signOutButton)

      const wasTriggered = propSignOut.mock.calls.length > 0 || mockSignOut.mock.calls.length > 0
      expect(wasTriggered).toBe(true)
    })
  })

  describe('Transparent Navbar Layout', () => {
    it('should render with transparent or backdrop-blur styling classes', () => {
      const { container } = renderNavbar()

      const header = container.querySelector('header, nav, [data-testid="navbar"]')
      expect(header).not.toBeNull()

      const className = header?.getAttribute('class') ?? ''
      const hasTransparentStyling =
        className.includes('bg-transparent') ||
        className.includes('backdrop-blur') ||
        className.includes('bg-white/80') ||
        className.includes('bg-background/80') ||
        className.includes('sticky')

      expect(hasTransparentStyling).toBe(true)
    })
  })
})
