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

async function openColorTab(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Color' }).click()
}

test.describe('Color Tab', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await openColorTab(page)
  })

  test('shows empty state when no property selected', async ({ page }) => {
    const legend = page.getByTestId('color-legend')
    await expect(legend).toContainText('Select a property to visualise node colors.')
  })

  test('no active dot when no property selected', async ({ page }) => {
    await expect(page.getByTestId('color-active-dot')).not.toBeVisible()
  })

  test('active dot appears when property selected', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
    await expect(page.getByTestId('color-active-dot')).toBeVisible()
  })

  test('selecting number property shows gradient legend', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
    await expect(page.getByTestId('color-legend-gradient')).toBeVisible()
  })

  test('selecting boolean property shows discrete legend', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'active' }).click()
    await expect(page.getByTestId('color-legend-discrete')).toBeVisible()
    await expect(page.getByTestId('color-legend-discrete')).toContainText('false')
    await expect(page.getByTestId('color-legend-discrete')).toContainText('true')
  })

  test('selecting string property shows discrete legend with values', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'status' }).click()
    const legend = page.getByTestId('color-legend-discrete')
    await expect(legend).toBeVisible()
    await expect(legend).toContainText('active')
    await expect(legend).toContainText('inactive')
    await expect(legend).toContainText('pending')
  })

  test('setting property to None removes gradient and active dot', async ({ page }) => {
    // Select a property first
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
    await expect(page.getByTestId('color-active-dot')).toBeVisible()

    // Set back to None
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'None' }).click()
    await expect(page.getByTestId('color-active-dot')).not.toBeVisible()
    await expect(page.getByTestId('color-legend')).toContainText('Select a property to visualise node colors.')
  })

  test('changing palette updates legend', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()

    // Change palette to Reds
    await page.getByTestId('color-palette-select').click()
    await page.getByRole('option', { name: 'Reds' }).click()

    // Legend gradient should still be visible (palette changed but property still set)
    await expect(page.getByTestId('color-legend-gradient')).toBeVisible()
  })

  test('switching to Filters tab and back preserves gradient', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
    await expect(page.getByTestId('color-legend-gradient')).toBeVisible()

    // Switch to Filters tab
    await page.getByRole('tab', { name: 'Filters' }).click()
    // Switch back to Color tab
    await page.getByRole('tab', { name: 'Color' }).click()

    await expect(page.getByTestId('color-legend-gradient')).toBeVisible()
    await expect(page.getByTestId('color-active-dot')).toBeVisible()
  })
})
