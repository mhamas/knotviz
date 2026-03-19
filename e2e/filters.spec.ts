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

  test('number filter has dual-handle slider', async ({ page }) => {
    await expect(page.getByTestId('filter-panel-age').getByTestId('number-filter')).toBeVisible()
  })

  test('boolean filter has radio group', async ({ page }) => {
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

test.describe('Clear All Filters', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('clear all button appears when filter is enabled', async ({ page }) => {
    // Enable a filter
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()

    // Clear button appears
    await expect(page.getByText('Clear all filters').first()).toBeVisible()
  })

  test('clear all resets match count', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await panel.getByRole('radio', { name: 'True' }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')

    // Clear all
    await page.getByText('Clear all filters').first().click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })
})

test.describe('Panel Collapse', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('chevron collapses panel body', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-age')
    // Number filter visible initially
    await expect(panel.getByTestId('number-filter')).toBeVisible()

    // Click chevron to collapse
    await panel.getByLabel('Collapse').click()
    await expect(panel.getByTestId('number-filter')).not.toBeVisible()

    // Click again to expand
    await panel.getByLabel('Expand').click()
    await expect(panel.getByTestId('number-filter')).toBeVisible()
  })

  test('checkbox remains clickable when collapsed', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    // Collapse
    await panel.getByLabel('Collapse').click()

    // Checkbox still works
    await panel.getByRole('checkbox').click()
    await expect(page.getByText('Clear all filters').first()).toBeVisible()
  })
})

test.describe('AND Logic', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('AND note is visible', async ({ page }) => {
    await expect(page.getByText('Filters combine with AND')).toBeVisible()
  })
})
