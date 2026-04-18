/// <reference types="vitest" />
import path from 'path'
import fs from 'fs'
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

const alias = { '@': path.resolve(__dirname, './src/graph') }

/**
 * Vite plugin that serves the correct index.html for each mini-app in dev mode.
 * Required because `appType: 'custom'` disables Vite's default SPA fallback.
 * Without this, Vite would 404 on sub-paths like /graph/anything.
 */
function multiSpaFallback(): PluginOption {
  return {
    name: 'multi-spa-fallback',
    configureServer(server) {
      return (): void => {
        server.middlewares.use(async (req, res, next) => {
          const url = (req.url ?? '').split('?')[0]

          // Skip static assets and Vite internal requests
          if (url.includes('.') || url.startsWith('/@') || url.startsWith('/src/')) {
            return next()
          }

          // Route /graph/* to graph/index.html
          if (url.startsWith('/graph')) {
            const htmlPath = path.resolve(__dirname, 'graph/index.html')
            let html = fs.readFileSync(htmlPath, 'utf-8')
            html = await server.transformIndexHtml(url, html)
            res.setHeader('Content-Type', 'text/html')
            return res.end(html)
          }

          // All other paths fall through to root index.html (homepage)
          const htmlPath = path.resolve(__dirname, 'index.html')
          let html = fs.readFileSync(htmlPath, 'utf-8')
          html = await server.transformIndexHtml(url, html)
          res.setHeader('Content-Type', 'text/html')
          return res.end(html)
        })
      }
    },
  }
}

export default defineConfig({
  appType: 'custom',
  plugins: [react(), multiSpaFallback()],
  resolve: { alias },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        graph: path.resolve(__dirname, 'graph/index.html'),
      },
    },
  },
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
          // Large-file tests are opt-in via `test:large-graphs`, not part of the default suite.
          exclude: ['node_modules/**', 'src/graph/test/large-files/**'],
          coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'large-files',
          globals: true,
          environment: 'node',
          include: ['src/graph/test/large-files/**/*.test.ts'],
          testTimeout: 600_000,
          hookTimeout: 600_000,
          // One test process at a time so a 3M-node XML parse can use the whole heap.
          pool: 'forks',
          fileParallelism: false,
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
