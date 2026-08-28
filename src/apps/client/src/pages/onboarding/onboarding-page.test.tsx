import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OnboardingPage } from './onboarding-page'
import { authClient } from '@/lib/auth-client'
import { MemoryRouter } from 'react-router'

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    organization: {
      create: vi.fn(),
    },
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('should render the form with the question "¿Cómo se llama tu agencia?" and a submit button', () => {
      render(
        <MemoryRouter>
          <OnboardingPage />
        </MemoryRouter>,
      )

      expect(screen.getByLabelText(/¿Cómo se llama tu agencia\?/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /crear|continuar|guardar|empezar/i })).toBeInTheDocument()
    })
  })

  describe('Submission Flow', () => {
    it('should call authClient.organization.create with name and slug, and redirect to /dashboard on success', async () => {
      vi.mocked(authClient.organization.create).mockResolvedValueOnce({
        data: { id: 'org_123', name: 'Seguros Martínez', slug: 'seguros-martinez' },
        error: null,
      } as any)

      render(
        <MemoryRouter>
          <OnboardingPage />
        </MemoryRouter>,
      )

      const input = screen.getByLabelText(/¿Cómo se llama tu agencia\?/i)
      fireEvent.change(input, { target: { value: 'Seguros Martínez' } })

      const button = screen.getByRole('button', { name: /crear|continuar|guardar|empezar/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(authClient.organization.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Seguros Martínez',
            slug: 'Seguros Martínez',
          }),
        )
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should display an error alert/message if organization creation fails', async () => {
      vi.mocked(authClient.organization.create).mockResolvedValueOnce({
        data: null,
        error: { message: 'El usuario ya pertenece a una agencia' },
      } as any)

      render(
        <MemoryRouter>
          <OnboardingPage />
        </MemoryRouter>,
      )

      const input = screen.getByLabelText(/¿Cómo se llama tu agencia\?/i)
      fireEvent.change(input, { target: { value: 'Seguros Martínez' } })

      const button = screen.getByRole('button', { name: /crear|continuar|guardar|empezar/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/El usuario ya pertenece a una agencia|error/i)).toBeInTheDocument()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should not call authClient.organization.create when name is empty or only whitespace', async () => {
      render(
        <MemoryRouter>
          <OnboardingPage />
        </MemoryRouter>,
      )

      const input = screen.getByLabelText(/¿Cómo se llama tu agencia\?/i)
      fireEvent.change(input, { target: { value: '    ' } })

      const button = screen.getByRole('button', { name: /crear|continuar|guardar|empezar/i })
      fireEvent.click(button)

      expect(authClient.organization.create).not.toHaveBeenCalled()
    })

    it('should trim surrounding whitespace from name input on submission', async () => {
      vi.mocked(authClient.organization.create).mockResolvedValueOnce({
        data: { id: 'org_99', name: 'La Perseverancia', slug: 'la-perseverancia' },
        error: null,
      } as any)

      render(
        <MemoryRouter>
          <OnboardingPage />
        </MemoryRouter>,
      )

      const input = screen.getByLabelText(/¿Cómo se llama tu agencia\?/i)
      fireEvent.change(input, { target: { value: '   La Perseverancia   ' } })

      const button = screen.getByRole('button', { name: /crear|continuar|guardar|empezar/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(authClient.organization.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'La Perseverancia',
          }),
        )
      })
    })

    it('should prevent double submission when submit is triggered multiple times in rapid succession', async () => {
      let resolveCreation!: (value: any) => void
      const pendingPromise = new Promise((resolve) => {
        resolveCreation = resolve
      })
      vi.mocked(authClient.organization.create).mockReturnValueOnce(pendingPromise as any)

      render(
        <MemoryRouter>
          <OnboardingPage />
        </MemoryRouter>,
      )

      const input = screen.getByLabelText(/¿Cómo se llama tu agencia\?/i)
      fireEvent.change(input, { target: { value: 'Seguros Único' } })

      const button = screen.getByRole('button', { name: /crear|continuar|guardar|empezar/i })
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)

      // Only one invocation should be triggered while pending
      expect(authClient.organization.create).toHaveBeenCalledTimes(1)

      resolveCreation({ data: { id: 'org_1' }, error: null })
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
    })

    it('should allow submitting the form by pressing Enter inside the text input', async () => {
      vi.mocked(authClient.organization.create).mockResolvedValueOnce({
        data: { id: 'org_enter', name: 'Enter Agency', slug: 'enter-agency' },
        error: null,
      } as any)

      render(
        <MemoryRouter>
          <OnboardingPage />
        </MemoryRouter>,
      )

      const input = screen.getByLabelText(/¿Cómo se llama tu agencia\?/i)
      fireEvent.change(input, { target: { value: 'Enter Agency' } })
      fireEvent.submit(input.closest('form') ?? input)

      await waitFor(() => {
        expect(authClient.organization.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Enter Agency',
          }),
        )
      })
    })
  })
})

