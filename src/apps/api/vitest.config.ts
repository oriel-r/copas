import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    {
      name: 'cloudflare-workers-virtual',
      resolveId(id) {
        if (id === 'cloudflare:workers' || id === 'cloudflare:workflows') {
          return `\0${id}`
        }
      },
      load(id) {
        if (id === '\0cloudflare:workers' || id === '\0cloudflare:workflows') {
          return `
            export class WorkerEntrypoint {
              constructor(ctx, env) {
                this.ctx = ctx;
                this.env = env;
              }
            }
            export class WorkflowEntrypoint {
              constructor(ctx, env) {
                this.ctx = ctx;
                this.env = env;
              }
            }
          `
        }
      },
    },
  ],
  test: {
    environment: 'node',
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'platform/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['src/modules/auth/auth.integration.test.ts'],
  },
})

