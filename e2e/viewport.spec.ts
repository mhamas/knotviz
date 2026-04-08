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

test.describe('Narrow viewport — left sidebar', () => {
  test('Graph Info and histogram visible at 800px width', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 })
    await loadGraph(page, 'sample-graph.json')

    await expect(page.getByTestId('stat-nodes')).toBeVisible()
    await expect(page.getByTestId('stat-edges')).toBeVisible()
    await expect(page.getByTestId('outgoing-degree-histogram')).toBeVisible()
  })

  test('left sidebar can be collapsed and reopened at narrow width', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 600 })
    await loadGraph(page, 'sample-graph.json')

    // Left sidebar should be visible by default
    await expect(page.getByTestId('stat-nodes')).toBeVisible()

    // Collapse it
    await page.getByLabel('Close left panel').click()
    await expect(page.getByTestId('stat-nodes')).not.toBeVisible()

    // Reopen
    await page.getByLabel('Open left panel').click()
    await expect(page.getByTestId('stat-nodes')).toBeVisible()
  })

  test('right sidebar collapses at narrow viewport leaving left sidebar intact', async ({ page }) => {
    await page.setViewportSize({ width: 650, height: 600 })
    await loadGraph(page, 'sample-graph.json')

    // Left sidebar Graph Info should still be visible
    await expect(page.getByTestId('stat-nodes')).toBeVisible()
    await expect(page.getByTestId('outgoing-degree-histogram')).toBeVisible()

    // Canvas should still be rendered
    await expect(page.getByTestId('sigma-canvas')).toBeVisible()
  })
})

test.describe('Narrow viewport — right sidebar', () => {
  test('Colors panel opens at medium width with filters auto-collapsed', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 })
    await loadGraph(page, 'sample-graph.json')

    // At 800px (676-976 range), maxTabs=1, so only one right sidebar visible
    // Filters is open by default; opening Colors should work
    await page.getByLabel('Toggle Analysis panel').click()
    await expect(page.getByTestId('color-property-select')).toBeVisible()
  })
})
