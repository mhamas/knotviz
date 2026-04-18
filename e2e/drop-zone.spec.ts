import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): string => path.join(__dirname, 'fixtures', name)

test.describe('Drop Zone — File Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/graph')
  })

  test('shows drop zone on initial load', async ({ page }) => {
    await expect(page.getByTestId('drop-zone')).toBeVisible()
    await expect(page.getByText('Drop a graph file here')).toBeVisible()
  })

  test('shows disabled sidebar controls before graph is loaded', async ({ page }) => {
    // Simulation section is collapsed before graph load
    await expect(page.getByText('Simulation')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset graph' })).toBeDisabled()
    await expect(page.getByTestId('stat-nodes')).toBeVisible()
    await expect(page.getByTestId('stat-nodes').getByText('0')).toBeVisible()
  })

  test('loads a valid graph via file chooser', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(fixture('sample-graph.json'))

    await expect(page.getByTestId('stat-nodes').getByText('5')).toBeVisible()
    await expect(page.getByTestId('stat-edges').getByText('6')).toBeVisible()
    await expect(page.getByTestId('sigma-canvas')).toBeVisible()
    await expect(page.getByText('sample-graph.json')).toBeVisible()
  })

  test('shows error for invalid graph file', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(fixture('invalid-graph.json'))

    await expect(page.getByTestId('error-message')).toBeVisible()
  })

  test('shows error for empty graph (0 nodes)', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(fixture('empty-graph.json'))

    await expect(page.getByTestId('error-message')).toBeVisible()
  })
})

test.describe('Drop Zone — Schema Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/graph')
  })

  test('schema link is visible inside drop zone', async ({ page }) => {
    await expect(page.getByText('View expected JSON schema')).toBeVisible()
  })

  test('clicking schema link opens dialog with tabs', async ({ page }) => {
    await page.getByText('View expected JSON schema').click()
    await expect(page.getByRole('heading', { name: 'Graph JSON Schema' })).toBeVisible()
    // All 3 tabs are present
    await expect(page.getByRole('tab', { name: 'Explanation' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'JSON Schema' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Examples' })).toBeVisible()
  })

  test('explanation tab shows field tables with required fields', async ({ page }) => {
    await page.getByText('View expected JSON schema').click()
    // Explanation tab is active by default
    await expect(page.getByText('Top-level fields')).toBeVisible()
    await expect(page.getByText('Node fields')).toBeVisible()
    await expect(page.getByText('Edge fields')).toBeVisible()
    // Required fields present
    await expect(page.getByRole('cell', { name: 'version', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'id', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'source', exact: true })).toBeVisible()
  })

  test('JSON Schema tab shows raw schema with copy button', async ({ page }) => {
    await page.getByText('View expected JSON schema').click()
    await page.getByRole('tab', { name: 'JSON Schema' }).click()
    await expect(page.locator('pre')).toContainText('"$schema"')
    await expect(page.locator('pre')).toContainText('json-schema.org')
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible()
  })

  test('examples tab shows minimal and full examples', async ({ page }) => {
    await page.getByText('View expected JSON schema').click()
    await page.getByRole('tab', { name: 'Examples' }).click()
    await expect(page.getByText('Minimal graph')).toBeVisible()
    await expect(page.getByText('Full-featured graph')).toBeVisible()
    // Both have copy buttons
    const copyButtons = page.getByRole('button', { name: 'Copy' })
    await expect(copyButtons).toHaveCount(2)
  })

  test('schema dialog can be closed', async ({ page }) => {
    await page.getByText('View expected JSON schema').click()
    await expect(page.getByRole('heading', { name: 'Graph JSON Schema' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Graph JSON Schema' })).not.toBeVisible()
  })
})
