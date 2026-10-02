import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as HeaderModule from './drawer-header'
import type { DrawerHeaderProps } from './drawer-header'

const DrawerHeader: React.ComponentType<DrawerHeaderProps> =
  (HeaderModule as any).DrawerHeader ?? (HeaderModule as any).default

describe('DrawerHeader Component', () => {
  const defaultProps: DrawerHeaderProps = {
    fullName: 'JUAN CARLOS PEREZ',
    companies: ['Sancor Seguros', 'Federación Patronal'],
    activePoliciesCount: 2,
    totalPoliciesCount: 3,
    onClose: vi.fn(),
  }

  describe('Header Information Rendering', () => {
    it('should render the full name of the insured', () => {
      render(<DrawerHeader {...defaultProps} />)

      expect(screen.getByText('JUAN CARLOS PEREZ')).toBeInTheDocument()
    })

    it('should render badges for each company associated with the insured', () => {
      render(<DrawerHeader {...defaultProps} />)

      expect(screen.getByText('Sancor Seguros')).toBeInTheDocument()
      expect(screen.getByText('Federación Patronal')).toBeInTheDocument()
    })

    it('should render active policies count vs total policies count', () => {
      render(<DrawerHeader {...defaultProps} />)

      const countElement = screen.getByText(/2\s*(\/|activas?(\s+de)?)\s*3/i, { exact: false })
      expect(countElement).toBeInTheDocument()
    })

    it('should render zero counts correctly without crashing', () => {
      render(
        <DrawerHeader
          {...defaultProps}
          activePoliciesCount={0}
          totalPoliciesCount={0}
        />,
      )

      const zeroElement = screen.getByText(/0\s*(\/|activas?(\s+de)?)\s*0/i, { exact: false })
      expect(zeroElement).toBeInTheDocument()
    })

    it('should render gracefully when companies array is empty', () => {
      render(<DrawerHeader {...defaultProps} companies={[]} />)

      expect(screen.getByText('JUAN CARLOS PEREZ')).toBeInTheDocument()
      expect(screen.queryByText('Sancor Seguros')).not.toBeInTheDocument()
    })
  })

  describe('Close Button Interaction', () => {
    it('should trigger onClose callback when clicking the close button', async () => {
      const user = userEvent.setup()
      const onCloseMock = vi.fn()

      render(<DrawerHeader {...defaultProps} onClose={onCloseMock} />)

      const closeButton =
        screen.queryByRole('button', { name: /cerrar|close/i }) ??
        screen.getByRole('button')

      await user.click(closeButton)

      expect(onCloseMock).toHaveBeenCalledOnce()
    })
  })
})
