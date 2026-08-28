import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './card'

describe('Card component', () => {
  it('renders card with content and custom className', () => {
    const { container } = render(<Card className="test-card"><div>Card content</div></Card>)

    expect(screen.getByText('Card content')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('test-card')
  })

  it('renders card without custom className when not provided', () => {
    const { container } = render(<Card><div>Default card</div></Card>)
    expect(screen.getByText('Default card')).toBeInTheDocument()
    expect(container.firstChild).toBeInTheDocument()
  })
})
