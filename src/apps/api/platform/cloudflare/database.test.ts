import { describe, expect, it } from 'vitest'
import { createDatabase } from './database'

describe('createDatabase', () => {
  it('creates a Drizzle database bound to D1', () => {
    const database = createDatabase({} as D1Database)

    expect(database).toBeDefined()
    expect(database.query.user).toBeDefined()
  })
})
