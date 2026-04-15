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
  // Cosmos needs a frame to settle the initial layout + fitView.
  await page.waitForTimeout(200)
}

/** Count rendered, visible label elements (children of the labels overlay). */
async function visibleLabelCount(page: Page): Promise<number> {
  return await page.locator('[data-testid="node-labels"] > div:not([style*="display: none"])').count()
}

/** Read the text content of all currently visible labels. */
async function visibleLabelTexts(page: Page): Promise<string[]> {
  return await page.locator('[data-testid="node-labels"] > div:not([style*="display: none"])').allTextContents()
}

test.describe('Show node labels', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'labels-1000-grid.json')
  })

  test('toggling the checkbox renders many labels (cosmos sampling cap is high enough)', async ({ page }) => {
    expect(await visibleLabelCount(page)).toBe(0)

    await page.getByRole('checkbox', { name: /Show node labels/ }).check()
    // Allow updateLabels to run.
    await page.waitForTimeout(150)

    const count = await visibleLabelCount(page)
    // With cosmos's default 150 px sampling distance on a typical viewport the
    // grid only yields ~54 candidates — well below MAX_LABELS=300. Asserting
    // we comfortably exceed that proves the finer LABEL_SAMPLING_PX is wired.
    expect(count).toBeGreaterThan(150)
  })

  test('zooming in changes which labels are shown (more detail at finer zoom)', async ({ page }) => {
    await page.getByRole('checkbox', { name: /Show node labels/ }).check()
    await page.waitForTimeout(150)
    const before = new Set(await visibleLabelTexts(page))
    expect(before.size).toBeGreaterThan(50)

    // Zoom in a few clicks via the canvas control button (cosmos's internal
    // zoom — fires onZoom which calls updateLabels).
    const zoomIn = page.getByRole('button', { name: 'Zoom in' })
    for (let i = 0; i < 4; i++) {
      await zoomIn.click()
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(150)

    const after = new Set(await visibleLabelTexts(page))
    expect(after.size).toBeGreaterThan(0)
    // After zooming in, the visible label set must change — otherwise zooming
    // is doing nothing for the labels overlay (the regression we're guarding
    // against). We require at least one label to differ between the two sets.
    const intersection = new Set([...before].filter((x) => after.has(x)))
    expect(intersection.size).toBeLessThan(before.size)
  })

  test('zooming in surfaces previously-clustered nodes as new labels', async ({ page }) => {
    await page.getByRole('checkbox', { name: /Show node labels/ }).check()
    await page.waitForTimeout(150)
    const before = new Set(await visibleLabelTexts(page))
    expect(before.size).toBeGreaterThan(50)

    // Zoom in substantially — previously off-screen-clustered nodes should
    // now become distinct, and at least some of them should be labels we
    // didn't see at the wider zoom.
    const zoomIn = page.getByRole('button', { name: 'Zoom in' })
    for (let i = 0; i < 6; i++) {
      await zoomIn.click()
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(200)

    const after = new Set(await visibleLabelTexts(page))
    const newlyVisible = [...after].filter((x) => !before.has(x))
    // Strict guard: zooming in should reveal nodes that weren't labeled at
    // the wider zoom. If this is 0, the labels overlay is effectively static.
    expect(newlyVisible.length).toBeGreaterThan(0)
  })

  test('labels are spatially distributed across the viewport (no clumping)', async ({ page }) => {
    await page.getByRole('checkbox', { name: /Show node labels/ }).check()
    await page.waitForTimeout(200)

    // Read the screen-Y position of every visible label and the canvas height.
    const result = await page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="node-labels"]')
      const canvas = document.querySelector('[data-testid="sigma-canvas"]')
      if (!overlay || !canvas) return null
      const labels = Array.from(overlay.children) as HTMLElement[]
      const visible = labels.filter((el) => el.style.display !== 'none')
      const ys = visible.map((el) => parseFloat(el.style.top))
      const h = (canvas as HTMLElement).clientHeight
      return { ys, h, count: visible.length }
    })
    expect(result).not.toBeNull()
    const { ys, h, count } = result!
    expect(count).toBeGreaterThan(50)

    // For uniformly-distributed input, the median label Y should sit around
    // the middle of the canvas. If labels are clumped at the bottom (the bug)
    // the median would be deep into the lower portion of the screen. Allow
    // generous slack but reject grossly-skewed distributions.
    ys.sort((a, b) => a - b)
    const median = ys[Math.floor(ys.length / 2)]
    expect(median).toBeGreaterThan(h * 0.25)
    expect(median).toBeLessThan(h * 0.75)

    // And labels should appear in BOTH the top and bottom halves of the canvas.
    const topHalf = ys.filter((y) => y < h / 2).length
    const bottomHalf = ys.filter((y) => y >= h / 2).length
    expect(topHalf).toBeGreaterThan(0)
    expect(bottomHalf).toBeGreaterThan(0)
    // Neither half should hold the whole population.
    expect(Math.min(topHalf, bottomHalf) / count).toBeGreaterThan(0.2)
  })

  test('toggling labels off clears the overlay', async ({ page }) => {
    await page.getByRole('checkbox', { name: /Show node labels/ }).check()
    await page.waitForTimeout(150)
    expect(await visibleLabelCount(page)).toBeGreaterThan(0)

    await page.getByRole('checkbox', { name: /Show node labels/ }).uncheck()
    await page.waitForTimeout(100)
    // Container is hidden via display:none — no labels are visually shown.
    const overlayDisplay = await page.locator('[data-testid="node-labels"]').evaluate((el) => getComputedStyle(el).display)
    expect(overlayDisplay).toBe('none')
  })

  test('label count stays bounded (does not grow without limit on big graphs)', async ({ page }) => {
    await page.getByRole('checkbox', { name: /Show node labels/ }).check()
    await page.waitForTimeout(200)
    const count = await visibleLabelCount(page)
    // MAX_LABELS=300 in useCosmos. Allow generous slack for off-screen culling
    // and screen-grid bounding, but the cap must be respected.
    expect(count).toBeLessThanOrEqual(300)
  })
})
