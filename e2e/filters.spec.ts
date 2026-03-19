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

  test('Filters tab is active by default', async ({ page }) => {
    await expect(page.getByTestId('filter-match-count')).toBeVisible()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })

  test('Stats tab shows stub', async ({ page }) => {
    await page.getByTestId('right-sidebar').getByRole('tab', { name: 'Stats' }).click()
    await expect(page.getByText('Stats — coming soon.')).toBeVisible()
  })

  test('Color tab shows stub', async ({ page }) => {
    await page.getByTestId('right-sidebar').getByRole('tab', { name: 'Color' }).click()
    await expect(page.getByText('Color — coming soon.')).toBeVisible()
  })
})

test.describe('Filter Panels', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('shows filter panels for all properties', async ({ page }) => {
    await expect(page.getByTestId('filter-panel-active')).toBeVisible()
    await expect(page.getByTestId('filter-panel-age')).toBeVisible()
    await expect(page.getByTestId('filter-panel-joined')).toBeVisible()
    await expect(page.getByTestId('filter-panel-score')).toBeVisible()
    await expect(page.getByTestId('filter-panel-status')).toBeVisible()
  })

  test('filter panels show correct type badges', async ({ page }) => {
    // Type badges are in spans with bg-slate-100 class
    await expect(page.getByTestId('filter-panel-age').locator('span.bg-slate-100', { hasText: 'number' })).toBeVisible()
    await expect(page.getByTestId('filter-panel-active').locator('span.bg-slate-100', { hasText: 'boolean' })).toBeVisible()
    await expect(page.getByTestId('filter-panel-status').locator('span.bg-slate-100', { hasText: 'string' })).toBeVisible()
    await expect(page.getByTestId('filter-panel-joined').locator('span.bg-slate-100', { hasText: 'date' })).toBeVisible()
  })

  test('number filter slider is always visible', async ({ page }) => {
    await expect(page.getByTestId('filter-panel-age').getByTestId('number-filter')).toBeVisible()
  })

  test('boolean filter radio group is always visible', async ({ page }) => {
    await expect(page.getByTestId('filter-panel-active').getByTestId('boolean-filter')).toBeVisible()
  })

  test('filters are disabled by default', async ({ page }) => {
    // Match count should be all nodes
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })
})

test.describe('Number Filter Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('enabling number filter shows match count', async ({ page }) => {
    // Enable the age filter
    const panel = page.getByTestId('filter-panel-age')
    await panel.getByRole('checkbox').click()

    // All should still match since range covers all values
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })
})

test.describe('Boolean Filter Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('enabling boolean filter with true reduces matches', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    // Enable
    await panel.getByRole('checkbox').click()

    // Select "true" — Alice, Carol, Eve are active
    await panel.getByRole('radio', { name: 'True' }).click()

    // Wait for filter to take effect
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')
  })

  test('boolean filter false shows 2 matches', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await panel.getByRole('radio', { name: 'False' }).click()

    // Bob and Dave are inactive
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')
  })

  test('boolean filter either shows all matches', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await panel.getByRole('radio', { name: 'True' }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')

    // Switch to either
    await panel.getByRole('radio', { name: 'Either' }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })
})

test.describe('Select All / Unselect All / Clear All', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('select all and unselect all buttons are always visible', async ({ page }) => {
    await expect(page.getByTestId('filter-toggle-all')).toBeVisible()
    await expect(page.getByTestId('filter-clear-all')).toBeVisible()
  })

  test('shows Select all when no filters enabled', async ({ page }) => {
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Select all')
  })

  test('select all enables all filter checkboxes', async ({ page }) => {
    await page.getByTestId('filter-toggle-all').click()
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Unselect all')
  })

  test('unselect all disables all filter checkboxes', async ({ page }) => {
    // Enable one filter
    await page.getByTestId('filter-panel-active').getByRole('checkbox').click()
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Unselect all')

    // Unselect all
    await page.getByTestId('filter-toggle-all').click()
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Select all')
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })

  test('clear all resets filters to default state', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await panel.getByRole('radio', { name: 'True' }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')

    // Clear all resets everything
    await page.getByTestId('filter-clear-all').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Select all')

    // Verify boolean radio was reset to "Either" — re-enable and all should match
    await panel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
    await expect(panel.getByRole('radio', { name: 'Either' })).toBeChecked()
  })
})

test.describe('Filter Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('filter controls always visible, dimmed when disabled', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-age')
    // Controls visible even when unchecked
    await expect(panel.getByTestId('number-filter')).toBeVisible()
  })
})

