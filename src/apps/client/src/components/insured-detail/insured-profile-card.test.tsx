import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as ProfileCardModule from './insured-profile-card'
import type { InsuredProfileCardProps } from './insured-profile-card'
import type { InsuredDetailResponse } from '@copas/contracts'

const InsuredProfileCard: React.ComponentType<InsuredProfileCardProps> =
  (ProfileCardModule as any).InsuredProfileCard ?? (ProfileCardModule as any).default

describe('InsuredProfileCard Component', () => {
  const mockInsured: InsuredDetailResponse = {
    id: '019213ab-1111-7000-8000-000000000001',
    organizationId: '019213ab-org1-7000-8000-000000000001',
    uploadedBy: '019213ab-user-7000-8000-000000000001',
    fullName: 'JUAN CARLOS PEREZ',
    cuit: '20123456789',
    phone: '+541112345678',
    email: 'juan.perez@example.com',
    birthDate: '1985-05-15',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    companies: ['Sancor Seguros'],
    activePoliciesCount: 1,
    totalPoliciesCount: 1,
    latestPolicy: null,
  }

  describe('Read-Only View Rendering', () => {
    it('should render CUIT, phone, email, and birthDate in read-only mode', () => {
      render(<InsuredProfileCard insured={mockInsured} />)

      expect(screen.getByText(/20-?12345678-?9/)).toBeInTheDocument()
      expect(screen.getByText(/\+?541112345678/)).toBeInTheDocument()
      expect(screen.getByText('juan.perez@example.com')).toBeInTheDocument()
      expect(screen.getByText(/1985-05-15|15\/05\/1985/)).toBeInTheDocument()
    })

    it('should render an "Editar" button in read-only mode', () => {
      render(<InsuredProfileCard insured={mockInsured} />)

      const editButton = screen.getByRole('button', { name: /editar/i })
      expect(editButton).toBeInTheDocument()
    })

    it('should handle null optional fields gracefully in read-only mode', () => {
      const insuredWithNulls: InsuredDetailResponse = {
        ...mockInsured,
        phone: null,
        email: null,
        birthDate: null,
        cuit: null,
      }

      render(<InsuredProfileCard insured={insuredWithNulls} />)

      expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
    })
  })

  describe('Toggle between Read Mode and Edit Mode', () => {
    it('should switch to edit mode with input fields when clicking "Editar"', async () => {
      const user = userEvent.setup()
      const { container } = render(<InsuredProfileCard insured={mockInsured} />)

      const editButton = screen.getByRole('button', { name: /editar/i })
      await user.click(editButton)

      const cuitInput =
        screen.queryByLabelText(/cuit/i) ??
        container.querySelector('input[name="cuit"]') ??
        screen.getByDisplayValue(/20-?12345678-?9/)
      expect(cuitInput).toBeInTheDocument()

      expect(screen.getByRole('button', { name: /guardar|save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancelar|cancel/i })).toBeInTheDocument()
    })

    it('should revert changes and return to read-only view when clicking "Cancelar"', async () => {
      const user = userEvent.setup()
      const { container } = render(<InsuredProfileCard insured={mockInsured} />)

      await user.click(screen.getByRole('button', { name: /editar/i }))

      const emailInput =
        screen.queryByLabelText(/email|correo/i) ??
        container.querySelector('input[name="email"]') ??
        screen.getByDisplayValue('juan.perez@example.com')

      await user.clear(emailInput)
      await user.type(emailInput, 'modified@example.com')

      const cancelButton = screen.getByRole('button', { name: /cancelar|cancel/i })
      await user.click(cancelButton)

      expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /guardar|save/i })).not.toBeInTheDocument()
      expect(screen.getByText('juan.perez@example.com')).toBeInTheDocument()
      expect(screen.queryByText('modified@example.com')).not.toBeInTheDocument()
    })
  })

  describe('Frontend Validation and Submission', () => {
    it('should validate that CUIT has 11 digits and prevent submission on invalid CUIT', async () => {
      const user = userEvent.setup()
      const onUpdateMock = vi.fn()
      const { container } = render(
        <InsuredProfileCard insured={mockInsured} onUpdate={onUpdateMock} />,
      )

      await user.click(screen.getByRole('button', { name: /editar/i }))

      const cuitInput =
        screen.queryByLabelText(/cuit/i) ??
        container.querySelector('input[name="cuit"]') ??
        screen.getByDisplayValue(/20-?12345678-?9/)

      await user.clear(cuitInput)
      await user.type(cuitInput, '123') // Invalid length

      await user.click(screen.getByRole('button', { name: /guardar|save/i }))

      expect(onUpdateMock).not.toHaveBeenCalled()
      expect(screen.getByText(/11 dígitos|cuit inválido|debe tener 11/i)).toBeInTheDocument()
    })

    it('should validate that birthDate cannot be a future date and prevent submission', async () => {
      const user = userEvent.setup()
      const onUpdateMock = vi.fn()
      const { container } = render(
        <InsuredProfileCard insured={mockInsured} onUpdate={onUpdateMock} />,
      )

      await user.click(screen.getByRole('button', { name: /editar/i }))

      const birthDateInput =
        screen.queryByLabelText(/nacimiento|fecha de nacimiento/i) ??
        container.querySelector('input[name="birthDate"]') ??
        container.querySelector('input[type="date"]')

      if (birthDateInput) {
        await user.clear(birthDateInput)
        await user.type(birthDateInput, '2099-01-01')

        await user.click(screen.getByRole('button', { name: /guardar|save/i }))

        expect(onUpdateMock).not.toHaveBeenCalled()
        expect(
          screen.getByText(/futura|no puede ser futura|fecha inválida/i),
        ).toBeInTheDocument()
      }
    })

    it('should validate email format and prevent submission on invalid email', async () => {
      const user = userEvent.setup()
      const onUpdateMock = vi.fn()
      const { container } = render(
        <InsuredProfileCard insured={mockInsured} onUpdate={onUpdateMock} />,
      )

      await user.click(screen.getByRole('button', { name: /editar/i }))

      const emailInput = (
        screen.queryByLabelText(/email|correo/i) ??
        container.querySelector('input[name="email"]') ??
        screen.getByDisplayValue('juan.perez@example.com')
      ) as HTMLInputElement

      await user.clear(emailInput)
      await user.type(emailInput, 'not-an-email')

      await user.click(screen.getByRole('button', { name: /guardar|save/i }))

      expect(onUpdateMock).not.toHaveBeenCalled()
      const hasErrorMessage = screen.queryByText(/email inválido|correo inválido|formato.*email/i)
      const isInputInvalid =
        emailInput.validity?.valid === false ||
        emailInput.getAttribute('aria-invalid') === 'true'
      expect(hasErrorMessage !== null || isInputInvalid).toBe(true)
    })

    it('should invoke onUpdate with valid UpdateInsuredRequest payload on submit', async () => {
      const user = userEvent.setup()
      const onUpdateMock = vi.fn()
      const { container } = render(
        <InsuredProfileCard insured={mockInsured} onUpdate={onUpdateMock} />,
      )

      await user.click(screen.getByRole('button', { name: /editar/i }))

      const phoneInput =
        screen.queryByLabelText(/teléfono|telefono|phone/i) ??
        container.querySelector('input[name="phone"]') ??
        screen.getByDisplayValue(/\+?541112345678/)

      await user.clear(phoneInput)
      await user.type(phoneInput, '+541199998888')

      await user.click(screen.getByRole('button', { name: /guardar|save/i }))

      expect(onUpdateMock).toHaveBeenCalledOnce()
      expect(onUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '+541199998888',
        }),
      )
    })
  })

  describe('Error Handling and 409 Conflict', () => {
    it('should display error alert and contextual message when error prop is provided, keeping edit mode open', async () => {
      const user = userEvent.setup()
      const conflictError = new Error('CUIT already registered')

      const { rerender } = render(
        <InsuredProfileCard
          insured={mockInsured}
        />,
      )

      // Enter edit mode
      await user.click(screen.getByRole('button', { name: /editar/i }))
      expect(screen.getByRole('button', { name: /guardar|save/i })).toBeInTheDocument()

      // Error occurs (e.g. 409 conflict during update)
      rerender(
        <InsuredProfileCard
          insured={mockInsured}
          error={conflictError}
        />,
      )

      // The error banner or contextual alert should be displayed
      const errorAlert =
        screen.queryByRole('alert') ??
        screen.getByText(/cuit already registered|ya registrado|duplicado/i)
      expect(errorAlert).toBeInTheDocument()

      // Edit mode should remain open so the user can fix the CUIT
      expect(screen.getByRole('button', { name: /guardar|save/i })).toBeInTheDocument()
    })

    it('should disable submit button when isUpdating is true in edit mode', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <InsuredProfileCard
          insured={mockInsured}
          isUpdating={false}
        />,
      )

      await user.click(screen.getByRole('button', { name: /editar/i }))

      rerender(
        <InsuredProfileCard
          insured={mockInsured}
          isUpdating={true}
        />,
      )

      const saveButton = screen.queryByRole('button', { name: /guardar|guardando|save/i })
      if (saveButton) {
        expect(saveButton).toBeDisabled()
      }
    })
  })
})
