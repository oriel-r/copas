import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './card'

describe('Card component', () => {
  it('renders card with content and custom className', () => {
    render(<Card className="test-card"><div>Card content</div></Card>)

    expect(screen.getByText('Card content')).toBeInTheDocument()
  })
})
