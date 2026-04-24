import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): string => path.join(__dirname, 'fixtures', name)

async function loadGraph(page: Page, name: string): Promise<void> {
  await page.goto('/graph')
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('drop-zone').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(fixture(name))
  await expect(page.getByTestId('sigma-canvas')).toBeVisible()
}

test.describe('Right Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('right sidebar shows color and filter controls', async ({ page }) => {
    // Both panels are closed by default — open them
    await page.getByLabel('Toggle Analysis panel').click()
    await page.getByLabel('Toggle Filters panel').click()
    await expect(page.getByTestId('color-property-select')).toBeVisible()
    await expect(page.getByTestId('filter-match-count')).toBeVisible()
  })

  test('filter panels are visible with match count', async ({ page }) => {
    await page.getByLabel('Toggle Filters panel').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5/5 nodes match')
    await expect(page.getByTestId('filter-panel-active')).toBeVisible()
    await expect(page.getByTestId('filter-panel-age')).toBeVisible()
    await expect(page.getByTestId('filter-panel-joined')).toBeVisible()
    await expect(page.getByTestId('filter-panel-score')).toBeVisible()
    await expect(page.getByTestId('filter-panel-status')).toBeVisible()
  })
})

test.describe('Filter Pipeline (end-to-end)', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await page.getByLabel('Toggle Filters panel').click()
  })

  test('enabling boolean filter reduces match count', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3/5 nodes match')

    await panel.getByRole('radio', { name: 'False' }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2/5 nodes match')
  })

  test('string filter selection reduces match count', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-status')
    await panel.getByRole('checkbox').first().click()

    const search = panel.getByTestId('string-filter-search')
    await search.fill('ac')
    await panel.getByTestId('string-filter-option').first().click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2/5 nodes match')
  })

  test('multiple filters combine with AND logic', async ({ page }) => {
    // Enable boolean (true) → 3 matches
    const boolPanel = page.getByTestId('filter-panel-active')
    await boolPanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3/5 nodes match')

    // Enable age filter (full range) → still 3
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3/5 nodes match')
  })

  test('select all / unselect all / clear all buttons work', async ({ page }) => {
    await page.getByTestId('filter-toggle-all').click()
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Unselect all')

    await page.getByTestId('filter-toggle-all').click()
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Select all')
    await expect(page.getByTestId('filter-match-count')).toHaveText('5/5 nodes match')
  })

  test('clear all resets all filters to defaults', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await panel.getByRole('radio', { name: 'False' }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2/5 nodes match')

    await page.getByTestId('filter-clear-all').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5/5 nodes match')
  })
})

test.describe('Number filter features', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await page.getByLabel('Toggle Filters panel').click()
  })

  test('number filter has histogram toggle and scale expander when enabled', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await expect(agePanel.getByTestId('number-filter-histogram-toggle')).toBeVisible()
    await expect(agePanel.getByTestId('number-filter-scale-expander')).toBeVisible()
    await expect(agePanel.getByTestId('number-filter-histogram')).not.toBeVisible()
  })

  test('histogram can be toggled on and off', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await expect(agePanel.getByTestId('number-filter-histogram')).not.toBeVisible()
    await agePanel.getByTestId('number-filter-histogram-toggle').click()
    await expect(agePanel.getByTestId('number-filter-histogram')).toBeVisible()
    await agePanel.getByTestId('number-filter-histogram-toggle').click()
    await expect(agePanel.getByTestId('number-filter-histogram')).not.toBeVisible()
  })

  test('scale expander reveals/hides lin/log/% row', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await expect(agePanel.getByTestId('number-filter-scale-row')).not.toBeVisible()
    await agePanel.getByTestId('number-filter-scale-expander').click()
    await expect(agePanel.getByTestId('number-filter-scale-row')).toBeVisible()
    await expect(agePanel.getByTestId('number-filter-scale-mode-linear')).toBeVisible()
    await expect(agePanel.getByTestId('number-filter-scale-mode-log')).toBeVisible()
    await expect(agePanel.getByTestId('number-filter-scale-mode-percentile')).toBeVisible()
    await agePanel.getByTestId('number-filter-scale-expander').click()
    await expect(agePanel.getByTestId('number-filter-scale-row')).not.toBeVisible()
  })

  test('log mode can be activated and does not break filtering', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5/5 nodes match')
    await agePanel.getByTestId('number-filter-scale-expander').click()
    await agePanel.getByTestId('number-filter-scale-mode-log').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5/5 nodes match')
  })

  test('percentile mode trims by p-range', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5/5 nodes match')
    await agePanel.getByTestId('number-filter-scale-expander').click()
    await agePanel.getByTestId('number-filter-scale-mode-percentile').click()
    // pct-tag indicators should appear under the slider
    await expect(agePanel.getByTestId('number-filter-pct-tag-min')).toHaveText('p0')
    await expect(agePanel.getByTestId('number-filter-pct-tag-max')).toHaveText('p100')
  })

  test('typing a value in min input and pressing Enter narrows the filter', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5/5 nodes match')
    const minInput = agePanel.getByTestId('number-filter-min')
    await minInput.click()
    await minInput.fill('30')
    await minInput.press('Enter')
    await expect(page.getByTestId('filter-match-count')).toHaveText('3/5 nodes match', { timeout: 3000 })
  })

  test('clear all resets number filter including scale mode', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await agePanel.getByTestId('number-filter-scale-expander').click()
    await agePanel.getByTestId('number-filter-scale-mode-log').click()
    await page.getByTestId('filter-clear-all').click()
    // After clear-all, the lin mode should be active again (re-open the expander)
    await agePanel.getByRole('checkbox').click()
    await agePanel.getByTestId('number-filter-scale-expander').click()
    await expect(agePanel.getByTestId('number-filter-scale-mode-linear')).toHaveAttribute('aria-pressed', 'true')
  })

  test('log mode + text input interop: typing value in log mode works correctly', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await agePanel.getByTestId('number-filter-scale-expander').click()
    await agePanel.getByTestId('number-filter-scale-mode-log').click()
    const maxInput = agePanel.getByTestId('number-filter-max')
    await maxInput.click()
    await maxInput.fill('35')
    await maxInput.press('Enter')
    await expect(page.getByTestId('filter-match-count')).toHaveText('4/5 nodes match', { timeout: 3000 })
  })
})
