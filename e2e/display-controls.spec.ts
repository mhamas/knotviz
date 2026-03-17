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

test.describe('Display Controls', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('node size and edge size sliders are visible', async ({ page }) => {
    await expect(page.getByText('Node size')).toBeVisible()
    await expect(page.getByText('Edge size')).toBeVisible()
  })

  test('Show edges checkbox is checked by default', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: 'Show edges' })
    await expect(checkbox).toBeChecked()
  })

  test('Show node labels checkbox is unchecked by default', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: 'Show node labels' })
    await expect(checkbox).not.toBeChecked()
  })

  test('Highlight neighbors checkbox is unchecked by default', async ({ page }) => {
    const checkbox = page.getByRole('checkbox', { name: 'Highlight neighbors on hover' })
    await expect(checkbox).not.toBeChecked()
  })

  test('checkboxes can be toggled', async ({ page }) => {
    const showEdges = page.getByRole('checkbox', { name: 'Show edges' })
    await showEdges.click()
    await expect(showEdges).not.toBeChecked()

    const showLabels = page.getByRole('checkbox', { name: 'Show node labels' })
    await showLabels.click()
    await expect(showLabels).toBeChecked()

    const highlight = page.getByRole('checkbox', { name: 'Highlight neighbors on hover' })
    await highlight.click()
    await expect(highlight).toBeChecked()
  })
})
