/**
 * Captures the four quickstart screenshots used on docs/index.mdx:
 *   - laid-out.png           (graph after force sim)
 *   - coloured-community.png (same graph, coloured by `community`)
 *   - sized-by-age.png       (same graph, sized by `age` — Size mode)
 *   - filtered.png           (community-colour + active=true filter)
 *
 * Prereq: `npm run dev` running on http://localhost:5173, and the root
 * devDependency `@playwright/test` installed with Chromium available.
 *
 * Usage: node docs/scripts/capture-screenshots.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'src', 'assets', 'quickstart')
mkdirSync(OUT_DIR, { recursive: true })

const PORT = process.env.PORT || '5173'
const STEP = process.env.STEP ? Number(process.env.STEP) : null // 1..4, stop after this step
const APP_URL = `http://localhost:${PORT}/graph?example=json/1k`
const VIEWPORT = { width: 1440, height: 900 }
const NODE_SIZE = 7
const SIM_SETTLE_MS = 8_000

const stopIf = async (step) => {
  if (STEP === step) {
    await browser.close()
    console.log(`Stopped after step ${step}.`)
    process.exit(0)
  }
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
})
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
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

const laidOutPath = join(OUT_DIR, 'laid-out.png')
await page.screenshot({ path: laidOutPath })
console.log(`✓ ${laidOutPath}`)
await stopIf(1)

console.log('Opening Analysis panel and colouring by community…')
await page.getByTestId('left-toggle-analysis').click()
await page.getByTestId('color-property-select').click()
await page.getByRole('option', { name: /^community/ }).click()
// Property selection defaults to `Size` mode; we want Color for this screenshot.
await page.getByTestId('visual-mode-color').click()
await page.waitForTimeout(1_000)

const colouredPath = join(OUT_DIR, 'coloured-community.png')
await page.screenshot({ path: colouredPath })
console.log(`✓ ${colouredPath}`)
await stopIf(2)

console.log('Switching to Size mode by age…')
await page.getByTestId('color-property-select').click()
await page.getByRole('option', { name: /^age/ }).click()
await page.getByTestId('visual-mode-size').click()
// Default size range is [1, 10]; widen dramatically so the tiny age=18 majority
// almost disappears and the few elderly outliers render as huge solo circles.
const minInput = page.getByTestId('size-range-min')
const maxInput = page.getByTestId('size-range-max')
await minInput.click()
await minInput.fill('1')
await minInput.press('Enter')
await maxInput.click()
await maxInput.fill('40')
await maxInput.press('Enter')
await page.waitForTimeout(1_000)

const sizedPath = join(OUT_DIR, 'sized-by-age.png')
await page.screenshot({ path: sizedPath })
console.log(`✓ ${sizedPath}`)
await stopIf(3)

// Revert to community-colour so the `filtered` screenshot shows the filter
// applied on top of the colour encoding the previous section established.
console.log('Reverting to community + Color for filtered screenshot…')
await page.getByTestId('color-property-select').click()
await page.getByRole('option', { name: /^community/ }).click()
await page.getByTestId('visual-mode-color').click()
await page.waitForTimeout(500)

console.log('Opening Filters panel and enabling active=true…')
await page.getByTestId('left-toggle-filters').click()
const activePanel = page.getByTestId('filter-panel-active')
await activePanel.getByRole('checkbox').click()
await activePanel.getByTestId('boolean-filter').getByRole('radio', { name: 'True' }).click()
await page.waitForTimeout(1_000)

const filteredPath = join(OUT_DIR, 'filtered.png')
await page.screenshot({ path: filteredPath })
console.log(`✓ ${filteredPath}`)

await browser.close()
console.log('Done.')
