/// <reference types="vitest" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

const alias = { '@': path.resolve(__dirname, './src/graph') }

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
          setupFiles: './src/graph/test/setup.ts',
          include: ['src/graph/test/**/*.test.{ts,tsx}'],
          exclude: ['node_modules/**'],
          coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'component',
          include: ['src/graph/components/__tests__/**/*.test.tsx'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: './src/graph/components/__tests__/setup.ts',
        },
      },
    ],
  },
})
