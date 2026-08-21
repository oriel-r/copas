import path from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig, defineProject, mergeConfig } from 'vitest/config'

async function readNestedMigrations(dir: string) {
  const entries = (await readdir(dir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
  return Promise.all(
    entries.map(async (e) => {
      const sql = await readFile(path.join(dir, e.name, 'migration.sql'), 'utf8')
      return {
        name: `${e.name}/migration.sql`,
        queries: sql.split(';').map((s) => s.trim()).filter((s) => s.length > 0),
      }
    }),
  )
}

export default defineConfig(async () => {
  const migrationsPath = path.resolve(process.cwd(), '../../packages/db/migrations')
  const migrations = await readNestedMigrations(migrationsPath)

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
        setupFiles: [path.resolve('src/modules/auth/auth.test-setup.ts')],
      },
    }),
  )
})