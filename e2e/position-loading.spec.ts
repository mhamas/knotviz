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

test.describe('Position-Aware Loading', () => {
  test('no warning when all nodes have positions', async ({ page }) => {
    await loadGraph(page, 'all-positions-graph.json')
    await expect(page.getByText('positions were randomized')).not.toBeVisible()
  })

  // Reading positions back requires Cosmos GPU pipeline (not available in SwiftShader)
  test.skip('preserves input positions when all nodes have x/y', async ({ page }) => {
    await loadGraph(page, 'all-positions-graph.json')
    // In a real browser, positions from the file should be preserved.
    // Cannot verify in headless SwiftShader — GPU position readback unavailable.
  })

  test('shows warning when some nodes have positions', async ({ page }) => {
    await loadGraph(page, 'partial-positions-graph.json')
    await expect(page.getByText('positions were randomized')).toBeVisible()
  })

  test('no warning when no nodes have positions', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await expect(page.getByText('positions were randomized')).not.toBeVisible()
  })
})
