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

test.describe('Graph View — Canvas and Controls', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('renders sigma canvas with correct node and edge counts', async ({ page }) => {
    await expect(page.getByTestId('stat-nodes').getByText('5')).toBeVisible()
    await expect(page.getByTestId('stat-edges').getByText('6')).toBeVisible()
  })

  test('shows filename label', async ({ page }) => {
    await expect(page.getByText('sample-graph.json')).toBeVisible()
  })

  test('canvas control buttons are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fit to view' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rotate clockwise' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rotate counter-clockwise' })).toBeVisible()
  })

  test('keyboard shortcuts help popover opens on click', async ({ page }) => {
    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click()
    await expect(page.getByText('Controls')).toBeVisible()
    await expect(page.getByText('Space')).toBeVisible()
    await expect(page.getByText('Start / stop simulation')).toBeVisible()
  })
})
