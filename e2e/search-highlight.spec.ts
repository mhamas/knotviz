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

test.describe('Search highlight', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await page.getByLabel('Toggle Filters panel').click()
  })

  test('search box is visible at the top of the filters panel', async ({ page }) => {
    await expect(page.getByTestId('search-box-input')).toBeVisible()
  })

  test('typing a label substring shows a match count', async ({ page }) => {
    await page.getByTestId('search-box-input').fill('Ali')
    await expect(page.getByTestId('search-box-count')).toHaveText('1 match')
  })

  test('match count uses plural wording', async ({ page }) => {
    // "a" appears in Alice, Carol, Dave — 3 labels. Also matches the haystack
    // includes node id; Bob has no "a" in either. Expect 3 matches.
    await page.getByTestId('search-box-input').fill('a')
    await expect(page.getByTestId('search-box-count')).toHaveText('3 matches')
  })

  test('a zero-match query shows "No matches"', async ({ page }) => {
    await page.getByTestId('search-box-input').fill('zzz-no-such-node')
    await expect(page.getByTestId('search-box-count')).toHaveText('No matches')
  })

  test('clear button resets the query and removes the count', async ({ page }) => {
    const input = page.getByTestId('search-box-input')
    await input.fill('Alice')
    await expect(page.getByTestId('search-box-count')).toBeVisible()
    await page.getByTestId('search-box-clear').click()
    await expect(input).toHaveValue('')
    await expect(page.getByTestId('search-box-count')).toHaveCount(0)
  })

  test('search is case-insensitive', async ({ page }) => {
    await page.getByTestId('search-box-input').fill('ALICE')
    await expect(page.getByTestId('search-box-count')).toHaveText('1 match')
  })

  test('matches node IDs too', async ({ page }) => {
    // Node ids are "1".."5"; searching "3" should match exactly one node
    await page.getByTestId('search-box-input').fill('3')
    await expect(page.getByTestId('search-box-count')).toHaveText('1 match')
  })

  test('match count survives an edge-% slider change (updateLinks path)', async ({ page }) => {
    await page.getByTestId('search-box-input').fill('a')
    await expect(page.getByTestId('search-box-count')).toHaveText('3 matches')

    // Drive the edge percentage slider — this triggers the worker's updateLinks
    // path, which re-runs appearance with cached params. The node-level
    // highlight should be untouched; count stays at 3.
    const slider = page.getByRole('slider').filter({ hasText: '' }).first()
    await slider.focus()
    await page.keyboard.press('Home') // jump to min — strongest single change
    await expect(page.getByTestId('search-box-count')).toHaveText('3 matches')

    await page.keyboard.press('End') // back to max
    await expect(page.getByTestId('search-box-count')).toHaveText('3 matches')
  })

  test('highlight survives switching the color gradient on and off', async ({ page }) => {
    await page.getByTestId('search-box-input').fill('a')
    await expect(page.getByTestId('search-box-count')).toHaveText('3 matches')

    // Open Analysis panel, switch to color mode, pick age → gradient active.
    await page.getByLabel('Toggle Analysis panel').click()
    await page.getByTestId('visual-mode-color').click()
    await page.getByTestId('color-property-select').click()
    await page.getByRole('option', { name: 'age' }).click()
    await expect(page.getByTestId('color-legend-gradient')).toBeVisible()

    // Search count is unchanged and still correct after the gradient pipeline
    // has rewritten RGB + alpha=1 for visible nodes — dimming must re-apply.
    await expect(page.getByTestId('search-box-count')).toHaveText('3 matches')
  })

  test('match count drops when a filter hides some highlighted nodes', async ({ page }) => {
    // Sample graph labels: Alice, Bob, Carol, Dave, Eve.
    // "a" matches Alice, Carol, Dave → 3 highlighted.
    await page.getByTestId('search-box-input').fill('a')
    await expect(page.getByTestId('search-box-count')).toHaveText('3 matches')

    // Enable the `active=true` boolean filter → Bob and Dave are hidden.
    // Remaining highlighted ∩ visible = Alice, Carol → 2.
    const panel = page.getByTestId('filter-panel-active')
    await panel.getByRole('checkbox').click()
    await expect(page.getByTestId('search-box-count')).toHaveText('2 matches')

    // Disable the filter → count returns to 3.
    await panel.getByRole('checkbox').click()
    await expect(page.getByTestId('search-box-count')).toHaveText('3 matches')
  })
})
