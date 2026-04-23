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

test.describe('Drop Zone — Formats Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/graph')
  })

  test('formats link is visible inside drop zone', async ({ page }) => {
    await expect(page.getByText('See accepted formats')).toBeVisible()
  })

  test('clicking formats link opens a dialog listing all five formats', async ({ page }) => {
    await page.getByText('See accepted formats').click()
    await expect(page.getByRole('heading', { name: 'Accepted formats' })).toBeVisible()
    // Each format is named in the dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('JSON', { exact: true })).toBeVisible()
    await expect(dialog.getByText('CSV edge list', { exact: true })).toBeVisible()
    await expect(dialog.getByText('CSV pair', { exact: true })).toBeVisible()
    await expect(dialog.getByText('GraphML', { exact: true })).toBeVisible()
    await expect(dialog.getByText('GEXF', { exact: true })).toBeVisible()
  })

  test('dialog links to the full docs reference', async ({ page }) => {
    await page.getByText('See accepted formats').click()
    const dialog = page.getByRole('dialog')
    // The "full reference" footer link points at the docs input-formats page
    const docsLink = dialog.getByRole('link', { name: /full reference|all formats/i })
    await expect(docsLink).toHaveAttribute('href', /\/docs\/input-formats/)
  })

  test('each format row links to its docs page', async ({ page }) => {
    await page.getByText('See accepted formats').click()
    const dialog = page.getByRole('dialog')
    // Five per-format "Docs" links, one per format
    const perFormatLinks = dialog.getByRole('link', { name: 'Docs' })
    await expect(perFormatLinks).toHaveCount(5)
  })

  test('formats dialog can be closed', async ({ page }) => {
    await page.getByText('See accepted formats').click()
    await expect(page.getByRole('heading', { name: 'Accepted formats' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Accepted formats' })).not.toBeVisible()
  })
})
