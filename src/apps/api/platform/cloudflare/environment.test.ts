import { describe, expect, it } from 'vitest'
import { requireEnvironmentValue } from './environment'

describe('requireEnvironmentValue', () => {
  it('returns a configured value', () => {
    expect(requireEnvironmentValue('configured', 'EXAMPLE')).toBe('configured')
  })

  it('throws when a value is missing', () => {
    expect(() => requireEnvironmentValue(undefined, 'EXAMPLE')).toThrow(
      'Missing required environment value: EXAMPLE',
    )
  })
})
