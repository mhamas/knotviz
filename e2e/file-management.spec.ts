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
    await expect(page.getByTestId('stat-nodes').getByText('5')).toBeVisible()
  })

  test('confirm loads the dropped file', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await expect(page.getByTestId('stat-nodes').getByText('5')).toBeVisible()

    // Drop the all-positions fixture (3 nodes) as a valid replacement file
    const fixtureContent = JSON.stringify({
      version: '1',
      nodes: [
        { id: '1', label: 'X', x: 0, y: 0 },
        { id: '2', label: 'Y', x: 1, y: 0 },
        { id: '3', label: 'Z', x: 0, y: 1 },
      ],
      edges: [{ source: '1', target: '2' }, { source: '2', target: '3' }],
    })

    await page.evaluate((content) => {
      const dt = new DataTransfer()
      dt.items.add(new File([content], 'new-graph.json', { type: 'application/json' }))
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }))
    }, fixtureContent)

    await expect(page.getByText('Load new file?')).toBeVisible()
    await page.getByRole('button', { name: 'Load new file' }).click()

    // New graph should be loaded (3 nodes, 1 edge)
    await expect(page.getByTestId('sigma-canvas')).toBeVisible()
    await expect(page.getByTestId('stat-nodes').getByText('3')).toBeVisible()
    await expect(page.getByTestId('stat-edges').getByText('2')).toBeVisible()
  })
})
