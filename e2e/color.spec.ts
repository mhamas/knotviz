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
    // Analysis panel is already open from beforeEach; open Filters too
    await page.getByLabel('Toggle Filters panel').click()
    await expect(page.getByTestId('color-property-select')).toBeVisible()
    await expect(page.getByTestId('filter-match-count')).toBeVisible()
  })

  test('default mode is size', async ({ page }) => {
    const sizeButton = page.getByTestId('visual-mode-size')
    await expect(sizeButton).toBeVisible()
    // Size range controls should be visible (confirms size mode is active)
    await expect(page.getByTestId('size-range-controls')).toBeVisible()
  })

  test('size mode: selecting numeric property shows size legend', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
    await expect(page.getByTestId('size-legend')).toBeVisible()
  })

  test('size mode: palette selector is hidden', async ({ page }) => {
    await expect(page.getByTestId('color-palette-select')).not.toBeVisible()
  })

  test('size mode: editable min/max inputs reflect range values', async ({ page }) => {
    await expect(page.getByTestId('size-range-min')).toBeVisible()
    await expect(page.getByTestId('size-range-max')).toBeVisible()
  })

  test('size mode: typing min value updates the range', async ({ page }) => {
    const minInput = page.getByTestId('size-range-min')
    await minInput.click()
    await minInput.fill('3')
    await minInput.press('Enter')
    await expect(minInput).toHaveValue('3')
  })

  test('switching from size to color shows palette selector', async ({ page }) => {
    await expect(page.getByTestId('color-palette-select')).not.toBeVisible()
    await switchToColorMode(page)
    await expect(page.getByTestId('color-palette-select')).toBeVisible()
    await expect(page.getByTestId('size-range-controls')).not.toBeVisible()
  })

  test('Grays palette is available in color mode', async ({ page }) => {
    await switchToColorMode(page)
    await page.getByTestId('color-palette-select').click()
    await expect(page.getByRole('option', { name: 'Grays' })).toBeVisible()
  })

  test('categorical property auto-picks a qualitative palette (Tableau10)', async ({ page }) => {
    await switchToColorMode(page)
    // Confirm default is Viridis (sequential) before selecting anything categorical.
    await expect(page.getByTestId('color-palette-select')).toContainText('Viridis')
    // `status` is a string property in the sample graph fixture.
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'status' }).click()
    await expect(page.getByTestId('color-palette-select')).toContainText('Tableau10')
  })

  test('switching back to a numeric property restores a sequential palette', async ({ page }) => {
    await switchToColorMode(page)
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'status' }).click()
    await expect(page.getByTestId('color-palette-select')).toContainText('Tableau10')
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
    await expect(page.getByTestId('color-palette-select')).toContainText('Viridis')
  })

  test('palette picker groups palettes by kind', async ({ page }) => {
    await switchToColorMode(page)
    await page.getByTestId('color-palette-select').click()
    const content = page.getByRole('listbox')
    await expect(content.getByText('Sequential', { exact: true })).toBeVisible()
    await expect(content.getByText('Diverging', { exact: true })).toBeVisible()
    await expect(content.getByText('Qualitative (categorical)', { exact: true })).toBeVisible()
    await expect(content.getByRole('option', { name: 'Tableau10' })).toBeVisible()
    await expect(content.getByRole('option', { name: 'Observable10' })).toBeVisible()
  })

  test('create custom palette: count input lets user type an explicit value', async ({ page }) => {
    await switchToColorMode(page)
    await page.getByTestId('color-palette-select').click()
    await page.getByRole('option', { name: '+ Create custom palette' }).click()
    const modal = page.getByTestId('create-palette-modal')
    await expect(modal).toBeVisible()

    const countInput = modal.getByTestId('palette-count-input')
    // Default slider position maps to 6, rendered with formatNumber.
    await expect(countInput).toHaveValue('6')

    // Type an explicit count and confirm with Enter.
    await countInput.click()
    await countInput.fill('1234')
    await countInput.press('Enter')
    await expect(countInput).toHaveValue('1,234')

    // Above-max clamps to 10,000.
    await countInput.click()
    await countInput.fill('99999')
    await countInput.press('Enter')
    await expect(countInput).toHaveValue('10,000')

    // Below-min clamps to 2.
    await countInput.click()
    await countInput.fill('0')
    await countInput.press('Enter')
    await expect(countInput).toHaveValue('2')

    // Escape reverts the in-progress edit.
    await countInput.click()
    await countInput.fill('42')
    await countInput.press('Escape')
    await expect(countInput).toHaveValue('2')
  })
})
