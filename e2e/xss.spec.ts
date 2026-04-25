import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): string => path.join(__dirname, 'fixtures', name)

/**
 * Regression tests for the XSS audit. Knotviz consumes user-provided graph
 * files and renders node labels, ids, property keys, and property values in
 * tooltips, search results, the stats panel, and label overlays. React's
 * `{value}` interpolation and DOM `textContent` both escape by default — but
 * a future refactor that introduces `dangerouslySetInnerHTML` on any of these
 * paths would silently re-open an XSS hole. These tests fail loudly if any
 * such regression lands.
 *
 * The fixture xss-graph.json carries `<script>` and `<img onerror>` payloads
 * in node ids, labels, property keys, and property values. Each payload, if
 * executed, sets a window.__xss* sentinel. The tests assert no sentinel is
 * ever written.
 */
test.describe('XSS — graph-file content cannot execute scripts', () => {
  test('loading a graph with malicious labels does not execute any payload', async ({ page }) => {
    await page.goto('/graph')
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(fixture('xss-graph.json'))

    // Wait for graph to load (canvas visible == parser succeeded).
    await expect(page.getByTestId('sigma-canvas')).toBeVisible()

    // If any payload executed, it set a window.__xss* sentinel. None should exist.
    const xssGlobals = await page.evaluate(() =>
      Object.keys(window).filter((k) => k.startsWith('__xss')),
    )
    expect(xssGlobals).toEqual([])
  })

  test('malicious label is preserved as text in the search haystack', async ({ page }) => {
    await page.goto('/graph')
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('drop-zone').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(fixture('xss-graph.json'))
    await expect(page.getByTestId('sigma-canvas')).toBeVisible()

    // Search by a substring of the malicious label. The haystack should
    // contain the literal "<script>" string — proves the parser preserved
    // the user's input as data and the search worker treats it as text.
    await page.getByTestId('search-box-input').fill('window.__xssLabel')
    await expect(page.getByTestId('search-box-count')).toHaveText('1 match')

    // Still no payload execution after search interaction.
    const xssGlobals = await page.evaluate(() =>
      Object.keys(window).filter((k) => k.startsWith('__xss')),
    )
    expect(xssGlobals).toEqual([])
  })
})
