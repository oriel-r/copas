import path from 'node:path'
import {
  cloudflareTest,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers'
import { defineConfig, defineProject, mergeConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrationsPath = path.resolve(
    process.cwd(),
    '../../packages/auth-db/migrations',
  )
  const migrations = await readD1Migrations(migrationsPath)

  return mergeConfig(
    defineConfig({
      test: {
        include: ['src/modules/auth/auth.integration.test.ts'],
      },
    }),
    defineProject({
      plugins: [
        cloudflareTest({
          wrangler: {
            configPath: './infra/cloudflare/wrangler.jsonc',
          },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
            },
          },
        }),
      ],
      test: {
        setupFiles: [
          path.resolve('src/modules/auth/auth.test-setup.ts'),
        ],
      },
    }),
  )
})
