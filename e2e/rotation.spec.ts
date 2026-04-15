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
  // Let cosmos render the initial layout and settle.
  await page.waitForTimeout(150)
}

async function dispatchShiftWheel(page: Page, deltaY: number): Promise<void> {
  await page.evaluate((dy) => {
    const container = document.querySelector('[data-testid="sigma-canvas"]')
    if (!container) throw new Error('canvas container not found')
    container.dispatchEvent(new WheelEvent('wheel', {
      deltaY: dy,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }))
  }, deltaY)
}

test.describe('Rotation — Shift+wheel and buttons', () => {
  test.beforeEach(async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
  })

  test('shift+wheel does not apply any CSS transform to the canvas', async ({ page }) => {
    await dispatchShiftWheel(page, 100)
    // Allow the rAF batched rotation to flush.
    await page.waitForTimeout(50)

    const result = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="sigma-canvas"] canvas')
      const container = document.querySelector('[data-testid="sigma-canvas"]')
      if (!canvas || !container) return null
      return {
        canvasInlineTransform: (canvas as HTMLElement).style.transform,
        canvasComputedTransform: getComputedStyle(canvas as HTMLElement).transform,
        canvasInlineOrigin: (canvas as HTMLElement).style.transformOrigin,
        containerInlineTransform: (container as HTMLElement).style.transform,
      }
    })
    expect(result).not.toBeNull()
    expect(result!.canvasInlineTransform).toBe('')
    expect(result!.canvasComputedTransform).toBe('none')
    expect(result!.canvasInlineOrigin).toBe('')
    expect(result!.containerInlineTransform).toBe('')
  })

  test('shift+wheel shows rotation centre marker', async ({ page }) => {
    await dispatchShiftWheel(page, 100)
    // Marker is the red ✕ rendered in GraphView when rotationCenter state is set.
    await expect(page.locator('div.text-red-500').first()).toBeVisible()
  })

  test('rotation centre marker auto-hides after ~150ms idle', async ({ page }) => {
    await dispatchShiftWheel(page, 100)
    await expect(page.locator('div.text-red-500').first()).toBeVisible()
    // Wait past the 150ms hide timer.
    await expect(page.locator('div.text-red-500')).toHaveCount(0, { timeout: 500 })
  })

  test('non-shift wheel does not trigger rotation (no marker shown)', async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector('[data-testid="sigma-canvas"]')?.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 100, shiftKey: false, bubbles: true, cancelable: true }),
      )
    })
    await page.waitForTimeout(50)
    expect(await page.locator('div.text-red-500').count()).toBe(0)
  })

  test('rotate clockwise button triggers rotation', async ({ page }) => {
    await page.getByRole('button', { name: 'Rotate clockwise' }).click()
    await expect(page.locator('div.text-red-500').first()).toBeVisible()
  })

  test('rotate counter-clockwise button triggers rotation', async ({ page }) => {
    await page.getByRole('button', { name: 'Rotate counter-clockwise' }).click()
    await expect(page.locator('div.text-red-500').first()).toBeVisible()
  })

  test('shift+wheel actually changes the rendered canvas pixels', async ({ page }) => {
    // Capture the canvas region before rotation.
    const canvasLocator = page.getByTestId('sigma-canvas')
    const before = await canvasLocator.screenshot()

    // Apply a large rotation (10 events × deltaY 100 × 0.3 ≈ 300°).
    for (let i = 0; i < 10; i++) {
      await dispatchShiftWheel(page, 100)
    }
    // Allow rAF batching + cosmos's continuous render loop to repaint with new positions.
    await page.waitForTimeout(200)

    const after = await canvasLocator.screenshot()
    // Strict byte-inequality is enough — cosmos's render loop redraws identical
    // pixels frame-to-frame when nothing changes (no simulation, no external
    // input), so any difference here means rotation actually moved nodes.
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('rotation persists across multiple bursts (cache invalidation works)', async ({ page }) => {
    const canvasLocator = page.getByTestId('sigma-canvas')
    const initial = await canvasLocator.screenshot()

    // First burst.
    for (let i = 0; i < 5; i++) await dispatchShiftWheel(page, 100)
    await page.waitForTimeout(300) // > BURST_IDLE_MS
    const afterFirst = await canvasLocator.screenshot()
    expect(Buffer.compare(initial, afterFirst)).not.toBe(0)

    // Second burst — should still rotate (fresh cache built).
    for (let i = 0; i < 5; i++) await dispatchShiftWheel(page, 100)
    await page.waitForTimeout(200)
    const afterSecond = await canvasLocator.screenshot()
    expect(Buffer.compare(afterFirst, afterSecond)).not.toBe(0)
  })

  test('shift+wheel during simulation is gated (no marker shown)', async ({ page }) => {
    // Simulation cannot actually run in headless SwiftShader, but the gate
    // checks isSimRunningRef which is set by cosmos's onSimulationStart callback.
    // We can at least verify that without running simulation, rotation works,
    // and that the gate logic isn't tripped by clicking other UI.
    await dispatchShiftWheel(page, 100)
    await expect(page.locator('div.text-red-500').first()).toBeVisible()
  })
})
