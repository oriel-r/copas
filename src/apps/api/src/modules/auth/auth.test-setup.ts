import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import type { D1Migration } from 'cloudflare:test'

type TestEnvironment = typeof env & {
  TEST_MIGRATIONS: D1Migration[]
}

const testEnvironment = env as TestEnvironment

await applyD1Migrations(
  testEnvironment.DB,
  testEnvironment.TEST_MIGRATIONS,
)
