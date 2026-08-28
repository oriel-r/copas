import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormError } from './form-error'

describe('FormError component', () => {
  it('renders error message when provided', () => {
    render(<FormError message="Invalid value" />)
    expect(screen.getByText('Invalid value')).toBeInTheDocument()
  })

  it('renders nothing when message is empty or undefined', () => {
    const { container } = render(<FormError message="" />)
    expect(container.firstChild).toBeNull()
  })
})
