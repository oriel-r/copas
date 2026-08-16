import { describe, expect, it } from 'vitest'
import { authSchema } from './auth'

describe('auth schema', () => {
  it('exports every Better Auth table', () => {
    expect(Object.keys(authSchema)).toEqual([
      'user',
      'session',
      'account',
      'verification',
      'organization',
      'member',
      'invitation',
      'rateLimit',
    ])
  })
})
