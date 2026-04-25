/**
 * Captures docs/public/screenshots/search-autocomplete.png used in
 * docs/src/content/docs/search.md.
 *
 * Shows the search autocomplete dropdown after typing "alice" — the
 * canvas behind dims non-matching nodes while matches stay at full
 * opacity.
 *
 * Prereq: `npm run dev` running on http://localhost:${PORT}` (default 5173).
 *
 * Usage: PORT=5180 node docs/scripts/capture-search.mjs
 */
import { chromium } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, '..', 'public', 'screenshots', 'search-autocomplete.png')

const PORT = process.env.PORT || '5173'
const APP_URL = `http://localhost:${PORT}/graph?example=json/1k`
const VIEWPORT = { width: 1440, height: 900 }
const NODE_SIZE = 7
const SIM_SETTLE_MS = 8_000

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
})
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
const page = await context.newPage()

console.log(`Navigating to ${APP_URL}`)
await page.goto(APP_URL)
await page.getByTestId('sigma-canvas').waitFor()
await page.waitForFunction(() => Boolean(window.__graphStore?.getState().isGraphLoaded))

await page.evaluate((n) => window.__graphStore.setState({ nodeSize: n }), NODE_SIZE)

console.log('Running simulation…')
await page.getByRole('button', { name: 'Run' }).click()
await page.waitForTimeout(SIM_SETTLE_MS)
await page.getByRole('button', { name: 'Stop' }).click()
await page.waitForTimeout(500)

console.log('Typing "alice" in the search box…')
const search = page.getByTestId('search-box-input')
await search.click()
await search.fill('alice')
await page.getByTestId('search-box-dropdown').waitFor()
await page.waitForTimeout(800)

await page.screenshot({ path: OUT_PATH })
console.log(`✓ ${OUT_PATH}`)

await browser.close()
console.log('Done.')
