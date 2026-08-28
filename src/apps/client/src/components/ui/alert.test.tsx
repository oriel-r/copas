import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Alert } from './alert'

describe('Alert component', () => {
  it('renders alert message and title correctly', () => {
    render(<Alert title="Warning">Be careful</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('title', 'Warning')
    expect(screen.getByText('Be careful')).toBeInTheDocument()
  })

  it('renders with children only when no title is provided', () => {
    render(<Alert>Notice message</Alert>)
    expect(screen.getByText('Notice message')).toBeInTheDocument()
  })
})
