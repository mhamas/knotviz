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

  test('Run starts simulation, Stop stops it', async ({ page }) => {
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByText('Simulating…')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run' })).toBeDisabled()

    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(page.getByText('Simulating…')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Stop' })).toBeDisabled()
  })

  test('Space bar toggles simulation', async ({ page }) => {
    await page.keyboard.press('Space')
    await expect(page.getByText('Simulating…')).toBeVisible()

    await page.keyboard.press('Space')
    await expect(page.getByText('Simulating…')).not.toBeVisible()
  })

  test('simulation settings section is collapsible', async ({ page }) => {
    // Settings should be collapsed by default
    await expect(page.getByText('Gravity')).not.toBeVisible()

    // Open settings
    await page.getByText('Simulation settings').click()
    await expect(page.getByText('Gravity')).toBeVisible()
    await expect(page.getByText('Speed')).toBeVisible()
    await expect(page.getByRole('button', { name: '↺ Randomize' })).toBeVisible()
  })

  test('simulation help popover shows description', async ({ page }) => {
    // Click the ? next to SIMULATION heading
    await page.locator('text=Simulation').locator('..').getByRole('button', { name: '?' }).click()
    await expect(page.getByText('force-directed layout')).toBeVisible()
  })
})
