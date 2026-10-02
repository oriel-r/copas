import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schemas/index.ts',
  out: './migrations',
  verbose: true,
})
