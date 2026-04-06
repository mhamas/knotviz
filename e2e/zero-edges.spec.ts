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

test.describe('Zero-edge graph', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'no-edges-graph.json')
  })

  test('Graph Info shows 3 nodes and 0 edges', async ({ page }) => {
    await expect(page.getByTestId('stat-nodes')).toContainText('3')
    await expect(page.getByTestId('stat-edges')).toContainText('0')
  })

  test('outgoing degree histogram is hidden when no edges exist', async ({ page }) => {
    // No edges → empty histogram → section not rendered
    await expect(page.getByTestId('outgoing-degree-histogram')).not.toBeVisible()
  })

  test('no console errors on graph load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    // Reload to capture errors from initial load
    await loadGraph(page, 'no-edges-graph.json')
    expect(errors).toEqual([])
  })

  test('simulation controls still work with zero edges', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Restart' })).toBeEnabled()
  })
})
