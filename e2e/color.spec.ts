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

/** Open the Analysis panel (collapsed by default after graph load). */
async function openAnalysisPanel(page: Page): Promise<void> {
  await page.getByLabel('Toggle Analysis panel').click()
  await expect(page.getByTestId('color-property-select')).toBeVisible()
}

/** Switch to color mode (default is size). */
async function switchToColorMode(page: Page): Promise<void> {
  await page.getByTestId('visual-mode-color').click()
}

test.describe('Color Tab', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await openAnalysisPanel(page)
  })

  test('shows empty state when no property selected', async ({ page }) => {
    const legend = page.getByTestId('color-legend')
    await expect(legend).toContainText('Select a property to visualise node')
  })

  test('selecting number property shows gradient legend in color mode', async ({ page }) => {
    await switchToColorMode(page)
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
    await expect(page.getByTestId('color-legend-gradient')).toBeVisible()
  })

  test('selecting boolean property shows discrete legend', async ({ page }) => {
    await switchToColorMode(page)
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'active' }).click()
    await expect(page.getByTestId('color-legend-discrete')).toBeVisible()
    await expect(page.getByTestId('color-legend-discrete')).toContainText('false')
    await expect(page.getByTestId('color-legend-discrete')).toContainText('true')
  })

  test('selecting string property shows discrete legend with values', async ({ page }) => {
    await switchToColorMode(page)
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'status' }).click()
    const legend = page.getByTestId('color-legend-discrete')
    await expect(legend).toBeVisible()
    await expect(legend).toContainText('active')
    await expect(legend).toContainText('inactive')
    await expect(legend).toContainText('pending')
  })

  test('setting property to None removes gradient', async ({ page }) => {
    await switchToColorMode(page)
    // Select a property first
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
    await expect(page.getByTestId('color-legend-gradient')).toBeVisible()

    // Set back to None
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'None' }).click()
    await expect(page.getByTestId('color-legend')).toContainText('Select a property to visualise node')
  })

  test('changing palette updates legend', async ({ page }) => {
    await switchToColorMode(page)
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()

    // Change palette to Reds
    await page.getByTestId('color-palette-select').click()
    await page.getByRole('option', { name: 'Reds' }).click()

    // Legend gradient should still be visible (palette changed but property still set)
    await expect(page.getByTestId('color-legend-gradient')).toBeVisible()
  })

  test('color controls and filter controls are both visible', async ({ page }) => {
    // Analysis panel is already open from beforeEach; filters tab is also open by default
    await expect(page.getByTestId('color-property-select')).toBeVisible()
    await expect(page.getByTestId('filter-match-count')).toBeVisible()
  })

  test('default mode is size', async ({ page }) => {
    const sizeButton = page.getByTestId('visual-mode-size')
    await expect(sizeButton).toBeVisible()
    // Size range controls should be visible (confirms size mode is active)
    await expect(page.getByTestId('size-range-controls')).toBeVisible()
  })
})
