import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): string => path.join(__dirname, 'fixtures', name)

async function loadFiles(page: Page, names: string[]): Promise<void> {
  await page.goto('/graph')
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('drop-zone').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(names.map(fixture))
  await expect(page.getByTestId('sigma-canvas')).toBeVisible()
}

test.describe('Multi-format import', () => {
  test('imports a single-file CSV edge list', async ({ page }) => {
    await loadFiles(page, ['sample-edge-list.csv'])
    await expect(page.getByTestId('stat-nodes').getByText('3')).toBeVisible()
    await expect(page.getByTestId('stat-edges').getByText('3')).toBeVisible()
  })

  test('imports a CSV nodes + edges pair', async ({ page }) => {
    await loadFiles(page, ['sample-nodes.csv', 'sample-edges.csv'])
    await expect(page.getByTestId('stat-nodes').getByText('3')).toBeVisible()
    await expect(page.getByTestId('stat-edges').getByText('3')).toBeVisible()
  })

  test('imports a GraphML file', async ({ page }) => {
    await loadFiles(page, ['sample-graph.graphml'])
    await expect(page.getByTestId('stat-nodes').getByText('3')).toBeVisible()
    await expect(page.getByTestId('stat-edges').getByText('3')).toBeVisible()
  })

  test('imports a GEXF file', async ({ page }) => {
    await loadFiles(page, ['sample-graph.gexf'])
    await expect(page.getByTestId('stat-nodes').getByText('3')).toBeVisible()
    await expect(page.getByTestId('stat-edges').getByText('3')).toBeVisible()
  })

  test('shows an error when dropping two unpaired CSVs', async ({ page }) => {
    await page.goto('/graph')
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    // Deliberately ambiguous names — no "nodes" or "edges" token
    await fileChooser.setFiles([fixture('sample-edges.csv'), fixture('sample-edge-list.csv')])
    await expect(page.getByTestId('error-message')).toBeVisible()
  })

  test('shows an error when dropping an unsupported extension', async ({ page }) => {
    await page.goto('/graph')
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'not-a-graph.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world'),
    })
    await expect(page.getByTestId('error-message')).toBeVisible()
  })
})
