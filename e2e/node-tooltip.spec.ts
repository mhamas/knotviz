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

test.describe('Node Tooltip', () => {
  // Node click requires Cosmos GPU pipeline to detect hovered point (not available in SwiftShader)
  test.skip('clicking a node opens tooltip with correct content', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    // In a real browser, clicking a node would open the tooltip.
    // Cannot test in headless SwiftShader — GPU point detection unavailable.
  })
})
