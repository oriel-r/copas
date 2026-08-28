import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { RequireAgency } from './require-agency'
import { authClient } from '@/lib/auth-client'

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useListOrganizations: vi.fn(),
    organization: {
      list: vi.fn(),
      setActive: vi.fn(),
    },
  },
}))

describe('RequireAgency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation
    vi.mocked(authClient.organization.list).mockResolvedValue({
      data: [],
      error: null,
    } as any)
    vi.mocked(authClient.organization.setActive).mockResolvedValue({
      data: null,
      error: null,
    } as any)
  })

  describe('Empty agency list (User has no agency)', () => {
    it('should redirect to /onboarding when organization list is empty', () => {
      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [],
        isPending: false,
        error: null,
      } as any)

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<RequireAgency />}>
              <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard Content</div>} />
            </Route>
            <Route path="/onboarding" element={<div data-testid="onboarding">Onboarding Page</div>} />
          </Routes>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('onboarding')).toBeInTheDocument()
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
    })
  })

  describe('User has an existing agency', () => {
    it('should render the Outlet and protected content if user has an agency', () => {
      const mockAgency = { id: 'org_1', name: 'Alpha Seguros', slug: 'alpha-seguros' }
      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [mockAgency],
        isPending: false,
        error: null,
      } as any)

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<RequireAgency />}>
              <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard Content</div>} />
            </Route>
            <Route path="/onboarding" element={<div data-testid="onboarding">Onboarding Page</div>} />
          </Routes>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument()
    })

    it('should ensure the agency is set as active via authClient.organization.setActive', () => {
      const mockAgency = { id: 'org_99', name: 'Beta Seguros', slug: 'beta-seguros' }
      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [mockAgency],
        isPending: false,
        error: null,
      } as any)

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<RequireAgency />}>
              <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  describe('Loading and Error Edge Cases', () => {
    it('should not redirect while organization query is pending / loading', () => {
      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: undefined,
        isPending: true,
        error: null,
      } as any)

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<RequireAgency />}>
              <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard Content</div>} />
            </Route>
            <Route path="/onboarding" element={<div data-testid="onboarding">Onboarding Page</div>} />
          </Routes>
        </MemoryRouter>,
      )

      // When pending, should neither render protected dashboard nor redirect prematurely to onboarding
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
      expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument()
    })

    it('should handle error state when fetching organizations fails', () => {
      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: null,
        isPending: false,
        error: { message: 'Network error fetching organizations' },
      } as any)

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<RequireAgency />}>
              <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard Content</div>} />
            </Route>
            <Route path="/onboarding" element={<div data-testid="onboarding">Onboarding Page</div>} />
          </Routes>
        </MemoryRouter>,
      )

      // Should not render protected content on error
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
    })
  })
})
