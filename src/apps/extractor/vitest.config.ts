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
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
