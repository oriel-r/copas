import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import Icons from 'unplugin-icons/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), Icons({ compiler: 'jsx', jsx: 'react' })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
