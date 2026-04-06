import { test, expect, type Page, type Locator } from '@playwright/test'
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

async function openColorsPanel(page: Page): Promise<void> {
  await page.getByLabel('Toggle Colors panel').click()
  await expect(page.getByTestId('color-property-select')).toBeVisible()
}

/** The Statistics collapsible section in the colors sidebar. */
function statsSection(page: Page): Locator {
  return page.locator('details', { has: page.getByText('Statistics') })
}

test.describe('Statistics Histogram', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await openColorsPanel(page)
  })

  test('histogram appears when numeric property selected', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()

    const histogram = statsSection(page).getByTestId('histogram')
    await expect(histogram).toBeVisible()

    // 5 nodes → Sturges: ceil(log2(5) + 1) = ceil(3.32) = 4 buckets
    const bars = histogram.locator('[data-testid="histogram-bar"]')
    await expect(bars).toHaveCount(4)
  })

  test('histogram bar tooltip shows range and count on hover', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()

    const histogram = statsSection(page).getByTestId('histogram')
    await expect(histogram).toBeVisible()

    // Hover over the first bar container
    const firstBarContainer = histogram.locator('.flex > div').first()
    await firstBarContainer.hover()

    const tooltip = statsSection(page).getByTestId('histogram-tooltip')
    await expect(tooltip).toBeVisible()
    // Tooltip should contain the "from – to: N nodes" pattern
    const text = await tooltip.textContent()
    expect(text).toMatch(/\d.*–.*\d.*:\s*\d+\s*nodes?/)
  })

  test('histogram appears for date property', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'joined' }).click()

    const histogram = statsSection(page).getByTestId('histogram')
    await expect(histogram).toBeVisible()

    const bars = histogram.locator('[data-testid="histogram-bar"]')
    const count = await bars.count()
    expect(count).toBeGreaterThan(0)
  })

  test('no histogram for categorical property', async ({ page }) => {
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'status' }).click()

    // Statistics section should show but no histogram (categorical)
    await expect(statsSection(page).getByTestId('histogram')).not.toBeVisible()
  })

  test('histogram disappears when property set to None', async ({ page }) => {
    // Select a numeric property
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
    await expect(statsSection(page).getByTestId('histogram')).toBeVisible()

    // Set back to None
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'None' }).click()
    await expect(statsSection(page).getByTestId('histogram')).not.toBeVisible()
  })
})

test.describe('Outgoing Degree Histogram', () => {
  test('shows outgoing degree histogram after loading graph', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    const histogram = page.getByTestId('outgoing-degree-histogram')
    await expect(histogram).toBeVisible()
    const bars = histogram.locator('[data-testid="histogram-bar"]')
    const count = await bars.count()
    expect(count).toBeGreaterThan(0)
  })
})
