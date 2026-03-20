import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): string => path.join(__dirname, 'fixtures', name)

async function loadGraph(page: Page, name: string): Promise<void> {
  await page.goto('/')
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

  test('right sidebar is visible with tabs', async ({ page }) => {
    const sidebar = page.getByTestId('right-sidebar')
    await expect(sidebar).toBeVisible()
    await expect(sidebar.getByRole('tab', { name: 'Filters' })).toBeVisible()
    await expect(sidebar.getByRole('tab', { name: 'Stats' })).toBeVisible()
    await expect(sidebar.getByRole('tab', { name: 'Color' })).toBeVisible()
  })

  test('Filters tab shows match count and all filter panels', async ({ page }) => {
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
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
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')

    await panel.getByRole('radio', { name: 'False' }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')
  })

  test('string filter selection reduces match count', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-status')
    await panel.getByRole('checkbox').first().click()

    const search = panel.getByTestId('string-filter-search')
    await search.fill('ac')
    await panel.getByTestId('string-filter-option').first().click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')
  })

  test('multiple filters combine with AND logic', async ({ page }) => {
    // Enable boolean (true) → 3 matches
    const boolPanel = page.getByTestId('filter-panel-active')
    await boolPanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')

    // Enable age filter (full range) → still 3
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')
  })

  test('select all / unselect all / clear all buttons work', async ({ page }) => {
    await page.getByTestId('filter-toggle-all').click()
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Unselect all')

    await page.getByTestId('filter-toggle-all').click()
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Select all')
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })

  test('clear all resets all filters to defaults', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await panel.getByRole('radio', { name: 'False' }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')

    await page.getByTestId('filter-clear-all').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })
})
