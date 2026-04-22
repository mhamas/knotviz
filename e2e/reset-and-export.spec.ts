import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
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

test.describe('Reset Graph', () => {
  test('reset button is disabled when no graph is loaded', async ({ page }) => {
    await page.goto('/graph')
    await expect(page.getByRole('button', { name: 'Reset graph' })).toBeDisabled()
  })

  test('reset button is enabled after loading a graph', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await expect(page.getByRole('button', { name: 'Reset graph' })).toBeEnabled()
  })

  test('reset shows confirmation dialog', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await page.getByRole('button', { name: 'Reset graph' }).click()
    await expect(page.getByText('Reset graph?')).toBeVisible()
    await expect(page.getByText('completely reset all graph data')).toBeVisible()
  })

  test('cancel keeps the graph loaded', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await page.getByRole('button', { name: 'Reset graph' }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByTestId('sigma-canvas')).toBeVisible()
    await expect(page.getByTestId('stat-nodes').getByText('5')).toBeVisible()
  })

  test('confirm resets to drop zone', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await page.getByRole('button', { name: 'Reset graph' }).click()
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByTestId('drop-zone')).toBeVisible()
    await expect(page.getByText('Drop a graph file here')).toBeVisible()
  })
})

test.describe('Graph Export', () => {
  test('download button triggers a file download', async ({ page }) => {
    await loadGraph(page, 'all-positions-graph.json')

    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('download-button').click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe('all-positions-graph.json')
  })

  test('exported file contains node positions', async ({ page }) => {
    await loadGraph(page, 'all-positions-graph.json')

    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('download-button').click()
    const download = await downloadPromise

    const content = await download.path().then(p => fs.readFileSync(p!, 'utf-8'))
    const data = JSON.parse(content)

    expect(data.version).toBe('1')
    expect(data.nodes).toHaveLength(3)
    expect(data.edges).toHaveLength(3)

    // All nodes should have x and y
    for (const node of data.nodes) {
      expect(typeof node.x).toBe('number')
      expect(typeof node.y).toBe('number')
    }
  })

  test('exported file round-trips back into the app', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')

    // Run simulation briefly to move nodes
    await page.keyboard.press('Space')
    await page.waitForTimeout(1000)
    await page.keyboard.press('Space')

    // Download
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('download-button').click()
    const download = await downloadPromise
    const downloadPath = await download.path()

    // Reset and reload the exported file
    await page.getByRole('button', { name: 'Reset graph' }).click()
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByTestId('drop-zone')).toBeVisible()

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(downloadPath!)

    // Should load without errors, positions preserved
    await expect(page.getByTestId('sigma-canvas')).toBeVisible()
    await expect(page.getByTestId('stat-nodes').getByText('5')).toBeVisible()
    await expect(page.getByTestId('stat-edges').getByText('6')).toBeVisible()
    // No partial position warning since exported file has all positions
    await expect(page.getByText('positions were randomized')).not.toBeVisible()
  })
})
