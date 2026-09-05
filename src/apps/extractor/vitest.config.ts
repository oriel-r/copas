import { defineConfig } from 'vitest/config'
import fs from 'node:fs'

export default defineConfig({
  plugins: [
    {
      name: 'md-as-text',
      transform(_code, id) {
        if (id.endsWith('.md')) {
          const content = fs.readFileSync(id, 'utf8')
          return `export default ${JSON.stringify(content)}`
        }
        return null
      },
    },
    {
      name: 'cloudflare-workflows-virtual',
      resolveId(id) {
        if (id === 'cloudflare:workflows') {
          return '\0cloudflare:workflows'
        }
      },
      load(id) {
        if (id === '\0cloudflare:workflows') {
          return `
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
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
