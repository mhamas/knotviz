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

test.describe('Simulation Controls', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  // GPU simulation cannot run in headless SwiftShader (no real GPU compute)
  test.skip('Run starts simulation, Stop stops it', async ({ page }) => {
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByText('Simulating…')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run' })).toBeDisabled()

    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(page.getByText('Simulating…')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Stop' })).toBeDisabled()
  })

  // GPU simulation cannot run in headless SwiftShader (no real GPU compute)
  test.skip('Space bar toggles simulation', async ({ page }) => {
    await page.keyboard.press('Space')
    await expect(page.getByText('Simulating…')).toBeVisible()

    await page.keyboard.press('Space')
    await expect(page.getByText('Simulating…')).not.toBeVisible()
  })
})
