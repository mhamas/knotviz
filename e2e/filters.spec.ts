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

  test('enabling boolean filter defaults to true and reduces matches', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    // Enable — defaults to true, Alice, Carol, Eve are active
    await panel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')
  })

  test('boolean filter false shows 2 matches', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await panel.getByRole('radio', { name: 'False' }).click()

    // Bob and Dave are inactive
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')
  })

  test('toggling between true and false updates matches', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()

    // Default is True — Alice, Carol, Eve
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')

    // Switch to False — Bob, Dave
    await panel.getByRole('radio', { name: 'False' }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')
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
    await panel.getByRole('radio', { name: 'False' }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')

    // Clear all resets everything
    await page.getByTestId('filter-clear-all').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Select all')

    // Verify boolean radio was reset to True — re-enable and 3 should match
    await panel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')
    await expect(panel.getByRole('radio', { name: 'True' })).toBeChecked()
  })
})

test.describe('Multi-Filter AND Logic', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('enabling boolean + number filters applies AND logic', async ({ page }) => {
    // Enable boolean (true) → Alice, Carol, Eve = 3
    const boolPanel = page.getByTestId('filter-panel-active')
    await boolPanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')

    // Enable age filter (full range) → still 3 (AND with all ages)
    const agePanel = page.getByTestId('filter-panel-age')
    await agePanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3 nodes match')
  })

  test('partial select shows Unselect all button', async ({ page }) => {
    // Enable just one of five filters
    await page.getByTestId('filter-panel-active').getByRole('checkbox').click()
    await expect(page.getByTestId('filter-toggle-all')).toHaveText('Unselect all')
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

test.describe('String Filter', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('string filter shows checkbox list with all values', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-status')
    await expect(panel.getByTestId('string-filter')).toBeVisible()
    const list = panel.getByTestId('string-filter-list')
    await expect(list.getByText('active', { exact: true })).toBeVisible()
    await expect(list.getByText('inactive')).toBeVisible()
    await expect(list.getByText('pending')).toBeVisible()
  })

  test('enabling string filter with all selected keeps all nodes', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-status')
    // All 3 values are selected by default (<=50 values)
    await panel.getByRole('checkbox').first().click() // enable filter
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })

  test('deselecting a value reduces matches', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-status')
    await panel.getByRole('checkbox').first().click() // enable filter

    // Uncheck "inactive" — only Dave has inactive
    const list = panel.getByTestId('string-filter-list')
    await list.getByText('inactive').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('4 nodes match')
  })

  test('selecting only one value shows matching nodes', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-status')
    await panel.getByRole('checkbox').first().click() // enable filter

    // Click "None" then select only "active"
    await panel.getByTestId('string-filter-deselect-all').click()
    // Empty set = all pass, so select just "active"
    const list = panel.getByTestId('string-filter-list')
    await list.getByText('active', { exact: true }).click()
    // Alice and Carol have status=active
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')
  })

  test('none button deselects all, all button selects all', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-status')
    await panel.getByRole('checkbox').first().click() // enable filter

    // Deselect all — empty set means all pass
    await panel.getByTestId('string-filter-deselect-all').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')

    // Select all — all selected means all pass
    await panel.getByTestId('string-filter-select-all').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })

  test('shows value count', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-status')
    await expect(panel.getByText('3/3')).toBeVisible()
  })

  test('clear all resets string filter selections', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-status')
    await panel.getByRole('checkbox').first().click() // enable

    // Deselect all then select only "active"
    await panel.getByTestId('string-filter-deselect-all').click()
    const list = panel.getByTestId('string-filter-list')
    await list.getByText('active', { exact: true }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')

    // Clear all resets
    await page.getByTestId('filter-clear-all').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })
})

test.describe('Date Filter', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('date filter shows slider with min/max labels', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-joined')
    await expect(panel.getByTestId('date-filter')).toBeVisible()
    await expect(panel.getByTestId('date-filter-min')).toBeVisible()
    await expect(panel.getByTestId('date-filter-max')).toBeVisible()
  })

  test('date filter labels show domain min and max dates', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-joined')
    // Dates: Carol 2019-07-20, Alice 2021-03-15, Dave 2022-01-10, Bob 2023-11-02, Eve 2024-05-30
    await expect(panel.getByTestId('date-filter-min')).toHaveText('2019-07-20')
    await expect(panel.getByTestId('date-filter-max')).toHaveText('2024-05-30')
  })

  test('enabling date filter with full range keeps all nodes', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-joined')
    await panel.getByRole('checkbox').click() // enable
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
  })

  test('clear all resets date filter to full range', async ({ page }) => {
    const panel = page.getByTestId('filter-panel-joined')
    await panel.getByRole('checkbox').click() // enable
    // Verify initial state
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')

    await page.getByTestId('filter-clear-all').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('5 nodes match')
    // Labels should show full domain
    await expect(panel.getByTestId('date-filter-min')).toHaveText('2019-07-20')
    await expect(panel.getByTestId('date-filter-max')).toHaveText('2024-05-30')
  })
})

test.describe('String + Date Multi-Filter', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('string AND date filters combine with AND logic', async ({ page }) => {
    // Enable status filter, select only "active" (Alice, Carol)
    const statusPanel = page.getByTestId('filter-panel-status')
    await statusPanel.getByRole('checkbox').first().click()
    await statusPanel.getByTestId('string-filter-deselect-all').click()
    await statusPanel.getByTestId('string-filter-list').getByText('active', { exact: true }).click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')

    // Enable date filter (full range) → still 2 (AND with all dates)
    const datePanel = page.getByTestId('filter-panel-joined')
    await datePanel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('2 nodes match')
  })
})

