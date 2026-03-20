/// <reference types="vitest" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

const alias = { '@': path.resolve(__dirname, './src') }

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          setupFiles: './src/test/setup.ts',
          include: ['src/test/**/*.test.{ts,tsx}'],
          exclude: ['node_modules/**'],
          coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'component',
          include: ['src/components/__tests__/**/*.test.tsx'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: './src/components/__tests__/setup.ts',
        },
      },
    ],
  },
})
