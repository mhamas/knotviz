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

test.describe('File Management — Load New File', () => {
  test('drag overlay appears when dragging over loaded graph', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')

    await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.items.add(new File(['{}'], 'test.json', { type: 'application/json' }))
      window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true }))
    })

    await expect(page.getByTestId('drag-overlay')).toHaveClass(/opacity-100/)
  })

  test('confirmation dialog appears when dropping file on loaded graph', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')

    await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.items.add(new File(['{}'], 'test.json', { type: 'application/json' }))
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }))
    })

    await expect(page.getByText('Load new file?')).toBeVisible()
    await expect(page.getByText('Loading a new file will clear the current graph')).toBeVisible()
  })

  test('cancel keeps current graph loaded', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')

    await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.items.add(new File(['{}'], 'test.json', { type: 'application/json' }))
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }))
    })

    await expect(page.getByText('Load new file?')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByTestId('sigma-canvas')).toBeVisible()
    await expect(page.getByText('Nodes').locator('..').getByText('5')).toBeVisible()
  })

  test('confirm resets to drop zone', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')

    await page.evaluate(() => {
      const dt = new DataTransfer()
      dt.items.add(new File(['{}'], 'test.json', { type: 'application/json' }))
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }))
    })

    await expect(page.getByText('Load new file?')).toBeVisible()
    await page.getByRole('button', { name: 'Load new file' }).click()
    await expect(page.getByTestId('drop-zone')).toBeVisible()
  })
})
