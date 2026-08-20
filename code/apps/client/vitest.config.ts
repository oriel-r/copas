import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  plugins: [
    ...(viteConfig.plugins ?? []).filter((p): p is NonNullable<typeof p> & { name: string } => !!p && typeof p === 'object' && 'name' in p && p.name !== 'cloudflare'),
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
}))
