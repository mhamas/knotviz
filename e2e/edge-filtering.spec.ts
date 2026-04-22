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

test.describe('Edge Filtering — Simulation Controls', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'weighted-edges-graph.json')
  })

  test('edge percentage slider is visible after loading graph', async ({ page }) => {
    await expect(page.getByText('Edges to keep (%)')).toBeVisible()
  })

  test('keep-at-least-one checkbox is visible', async ({ page }) => {
    await expect(page.getByText('Always keep strongest edge per node')).toBeVisible()
  })

  test('restart button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible()
  })

  test('edge filtering sliders are hidden before graph load (simulation collapsed)', async ({ page }) => {
    // Reset to drop zone
    await page.getByRole('button', { name: 'Reset graph' }).click()
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.getByTestId('drop-zone')).toBeVisible()
    // Simulation section is collapsed before graph load, so sliders are hidden
    await expect(page.getByText('Simulation')).toBeVisible()
    await expect(page.getByText('Edges to keep (%)')).toBeHidden()
  })
})

test.describe('Edge Filtering — Download Export', () => {
  test('download with no filtering exports all nodes and edges', async ({ page }) => {
    await loadGraph(page, 'weighted-edges-graph.json')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '↓ Download graph' }).click()
    const download = await downloadPromise

    const content = await download.path().then(p => fs.readFileSync(p!, 'utf-8'))
    const data = JSON.parse(content)

    expect(data.version).toBe('1')
    expect(data.nodes).toHaveLength(3)
    expect(data.edges).toHaveLength(3)
  })

  test('exported edges preserve weights; edge labels are intentionally dropped', async ({ page }) => {
    await loadGraph(page, 'weighted-edges-graph.json')

    // Download with no filtering — weights should round-trip; labels should NOT.
    // Knotviz doesn't render edge labels anywhere in the UI, and the docs are
    // explicit that edges only carry weight, so export drops the label field.
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '↓ Download graph' }).click()
    const download = await downloadPromise

    const content = await download.path().then(p => fs.readFileSync(p!, 'utf-8'))
    const data = JSON.parse(content)

    expect(data.edges).toHaveLength(3)
    const edgesWithWeight = data.edges.filter((e: Record<string, unknown>) => typeof e.weight === 'number')
    expect(edgesWithWeight.length).toBe(3)
    const edgesWithLabel = data.edges.filter((e: Record<string, unknown>) => typeof e.label === 'string')
    expect(edgesWithLabel.length).toBe(0)
  })
})
