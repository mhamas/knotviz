import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): string => path.join(__dirname, 'fixtures', name)

test.describe('Drop Zone — File Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows drop zone on initial load', async ({ page }) => {
    await expect(page.getByTestId('drop-zone')).toBeVisible()
    await expect(page.getByText('Drop a .json graph file here')).toBeVisible()
  })

  test('shows disabled sidebar controls before graph is loaded', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset graph' })).toBeDisabled()
    await expect(page.getByText('Nodes')).toBeVisible()
    await expect(page.getByText('0', { exact: true }).first()).toBeVisible()
  })

  test('loads a valid graph via file chooser', async ({ page }) => {
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(fixture('sample-graph.json'))

    await expect(page.getByText('Nodes').locator('..').getByText('5')).toBeVisible()
    await expect(page.getByText('Edges').locator('..').getByText('6')).toBeVisible()
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
