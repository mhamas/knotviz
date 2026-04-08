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
    // Colors panel is collapsed by default — open it
    await page.getByLabel('Toggle Colors panel').click()
    await expect(page.getByTestId('color-property-select')).toBeVisible()
    await expect(page.getByTestId('filter-match-count')).toBeVisible()
  })

  test('filter panels are visible with match count', async ({ page }) => {
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
  })

  test('number filter has log toggle and histogram when enabled', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    // Enable filter (controls are pointer-events-none when disabled)
    await agePanel.getByRole('checkbox').click()
    await expect(agePanel.getByTestId('number-filter-log-toggle')).toBeVisible()
    await expect(agePanel.getByTestId('number-filter-histogram-toggle')).toBeVisible()
    await expect(agePanel.getByTestId('number-filter-histogram')).toBeVisible()
  })

  test('histogram can be toggled off and on', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    // Enable filter first (controls are dimmed/non-interactive when disabled)
    await agePanel.getByRole('checkbox').click()
    await expect(agePanel.getByTestId('number-filter-histogram')).toBeVisible()
    await agePanel.getByTestId('number-filter-histogram-toggle').click()
    await expect(agePanel.getByTestId('number-filter-histogram')).not.toBeVisible()
    await agePanel.getByTestId('number-filter-histogram-toggle').click()
    await expect(agePanel.getByTestId('number-filter-histogram')).toBeVisible()
  })

  test('log toggle can be clicked and does not break filtering', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    // Enable filter first
    await agePanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5/5 nodes match')
    // Toggle log scale
    await agePanel.getByTestId('number-filter-log-toggle').click()
    // Match count should remain 5/5 (full range still selected)
    await expect(page.getByTestId('filter-match-count')).toHaveText('5/5 nodes match')
  })

  test('typing a value in min input and pressing Enter narrows the filter', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    // Enable the age filter
    await agePanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5/5 nodes match')
    // Type a min value that excludes the youngest node (age 27)
    const minInput = agePanel.getByTestId('number-filter-min')
    await minInput.click()
    await minInput.fill('30')
    await minInput.press('Enter')
    // Wait for debounce + worker round trip
    await expect(page.getByTestId('filter-match-count')).toHaveText('3/5 nodes match', { timeout: 3000 })
  })

  test('clear all resets number filter including log scale', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    // Enable filter first so we can interact with the log toggle
    await agePanel.getByRole('checkbox').click()
    // Toggle log scale on
    await agePanel.getByTestId('number-filter-log-toggle').click()
    // Clear all
    await page.getByTestId('filter-clear-all').click()
    // Log toggle should be back to inactive (no highlighted style)
    const logToggle = agePanel.getByTestId('number-filter-log-toggle')
    await expect(logToggle).toBeVisible()
  })

  test('log toggle + text input interop: typing value in log mode works correctly', async ({ page }) => {
    const agePanel = page.getByTestId('filter-panel-age')
    // Enable the filter
    await agePanel.getByRole('checkbox').click()
    // Toggle to log scale
    await agePanel.getByTestId('number-filter-log-toggle').click()
    // Type a max value
    const maxInput = agePanel.getByTestId('number-filter-max')
    await maxInput.click()
    await maxInput.fill('35')
    await maxInput.press('Enter')
    // Should narrow the results (ages 27, 28, 31, 34 ≤ 35 → 4 match)
    await expect(page.getByTestId('filter-match-count')).toHaveText('4/5 nodes match', { timeout: 3000 })
  })
})
