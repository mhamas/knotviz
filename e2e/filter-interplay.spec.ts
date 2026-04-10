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

/**
 * sample-graph.json:
 *   5 nodes: Alice(1,active=true), Bob(2,active=false), Carol(3,active=true),
 *            Dave(4,active=false), Eve(5,active=true)
 *   6 edges: 1→2, 2→3, 3→4, 4→5, 5→1, 1→3
 *
 *   active=true filter  → nodes 1,3,5  → visible edges: 5→1, 1→3  → 3 nodes, 2 edges
 *   active=false filter → nodes 2,4    → visible edges: none       → 2 nodes, 0 edges
 */

test.describe('Filter interplay — Graph Info reacts to node filters', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await page.getByLabel('Toggle Filters panel').click()
  })

  test('Graph Info shows all nodes and edges before any filter', async ({ page }) => {
    await expect(page.getByTestId('stat-nodes')).toContainText('5')
    await expect(page.getByTestId('stat-edges')).toContainText('6')
  })

  test('node filter reduces both node and edge counts in Graph Info', async ({ page }) => {
    // Enable active=true filter → 3 visible nodes, 2 visible edges
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    // Wait for worker to process and store to update
    await expect(page.getByTestId('stat-nodes')).toContainText('3 / 5')
    await expect(page.getByTestId('stat-edges')).toContainText('2 / 6')
  })

  test('node filter to false shows zero visible edges', async ({ page }) => {
    // active=false → nodes 2,4 → no edges between them
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await panel.getByRole('radio', { name: 'False' }).click()
    await expect(page.getByTestId('stat-nodes')).toContainText('2 / 5')
    await expect(page.getByTestId('stat-edges')).toContainText('0 / 6')
  })

  test('clearing filters restores full counts in Graph Info', async ({ page }) => {
    // Apply filter
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await expect(page.getByTestId('stat-nodes')).toContainText('3 / 5')

    // Clear all filters
    await page.getByTestId('filter-clear-all').click()
    await expect(page.getByTestId('stat-nodes')).toContainText('5')
    await expect(page.getByTestId('stat-edges')).toContainText('6')
    // Should show just the total, not "5 / 5"
    await expect(page.getByTestId('stat-nodes')).not.toContainText('/')
  })

  test('multiple node filters combined affect Graph Info correctly', async ({ page }) => {
    // Enable active=true → 3 nodes (Alice, Carol, Eve)
    const activePanel = page.getByTestId('filter-panel-active')
    await activePanel.getByRole('checkbox').click()
    await expect(page.getByTestId('stat-nodes')).toContainText('3 / 5')

    // Also enable status filter → selecting only "active" status
    // status: Alice=active, Carol=active, Eve=pending
    // Combined: active=true AND status=active → Alice, Carol → 2 nodes
    const statusPanel = page.getByTestId('filter-panel-status')
    await statusPanel.getByRole('checkbox').first().click()
    const search = statusPanel.getByTestId('string-filter-search')
    await search.fill('ac')
    await statusPanel.getByTestId('string-filter-option').first().click()

    await expect(page.getByTestId('stat-nodes')).toContainText('2 / 5')
    // Only edge 1→3 (Alice→Carol) has both endpoints visible
    await expect(page.getByTestId('stat-edges')).toContainText('1 / 6')
  })
})

test.describe('Filter interplay — statistics histogram reacts to node filters', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await page.getByLabel('Toggle Filters panel').click()
    // Open Colors panel and select a numeric property
    await page.getByLabel('Toggle Analysis panel').click()
    await expect(page.getByTestId('color-property-select')).toBeVisible()
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
  })

  test('statistics histogram visible with numeric property selected', async ({ page }) => {
    const statsSection = page.locator('details', { has: page.getByText('Statistics') })
    const histogram = statsSection.getByTestId('histogram')
    await expect(histogram).toBeVisible()
    // 5 nodes → 4 buckets (Sturges)
    const bars = histogram.locator('[data-testid="histogram-bar"]')
    await expect(bars).toHaveCount(4)
  })

  test('statistics histogram updates when node filter applied', async ({ page }) => {
    const statsSection = page.locator('details', { has: page.getByText('Statistics') })

    // Record stats before filtering
    const totalBefore = await statsSection.getByTestId('stat-total nodes').textContent()

    // Apply active=true filter → 3 visible nodes
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3/5 nodes match')

    // Stats should update — total count should change from 5 to 3
    await expect(statsSection.getByTestId('stat-total nodes')).not.toHaveText(totalBefore!)
    await expect(statsSection.getByTestId('stat-total nodes')).toContainText('3')
  })

  test('statistics p25/p75 change when node filter narrows the range', async ({ page }) => {
    const statsSection = page.locator('details', { has: page.getByText('Statistics') })

    // Record p25 before filtering (all 5 nodes: ages 27,28,31,34,45)
    const p25Before = await statsSection.getByTestId('stat-p25').textContent()

    // Apply active=true filter → ages 27,34,45 (Eve, Alice, Carol)
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await expect(page.getByTestId('filter-match-count')).toHaveText('3/5 nodes match')

    // p25 should change (from ~28 to ~30.5)
    const p25After = await statsSection.getByTestId('stat-p25').textContent()
    expect(p25After).not.toBe(p25Before)
  })
})

test.describe('Filter interplay — outgoing degree histogram reacts to node filters', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await page.getByLabel('Toggle Filters panel').click()
  })

  test('histogram is present before and after applying node filter', async ({ page }) => {
    const histogram = page.getByTestId('outgoing-degree-histogram')
    await expect(histogram).toBeVisible()
    const barsBefore = await histogram.locator('[data-testid="histogram-bar"]').count()
    expect(barsBefore).toBeGreaterThan(0)

    // Apply active=true filter
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await expect(page.getByTestId('stat-nodes')).toContainText('3 / 5')

    // Histogram should still be visible with bars
    await expect(histogram).toBeVisible()
    const barsAfter = await histogram.locator('[data-testid="histogram-bar"]').count()
    expect(barsAfter).toBeGreaterThan(0)
  })

  test('histogram updates when node filter changes', async ({ page }) => {
    // Hover first bar, record tooltip text (full graph)
    const histogram = page.getByTestId('outgoing-degree-histogram')
    const firstBar = histogram.locator('.flex > div').first()
    await firstBar.hover()
    const tooltipBefore = await histogram.getByTestId('histogram-tooltip').textContent()

    // Apply active=false filter → 2 nodes, 0 edges → all degrees are 0
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await panel.getByRole('radio', { name: 'False' }).click()
    await expect(page.getByTestId('stat-nodes')).toContainText('2 / 5')

    // Hover again — tooltip text should have changed
    await firstBar.hover()
    const tooltipAfter = await histogram.getByTestId('histogram-tooltip').textContent()
    expect(tooltipAfter).not.toBe(tooltipBefore)
  })
})
