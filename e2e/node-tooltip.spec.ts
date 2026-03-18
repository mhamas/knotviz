import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name: string): string => path.join(__dirname, 'fixtures', name)

async function loadGraph(page: Page, name: string): Promise<void> {
  await page.goto('/')
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByTestId('drop-zone').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(fixture(name))
  await expect(page.getByTestId('sigma-canvas')).toBeVisible()
}

/** Emit a Sigma clickNode event programmatically via React fiber traversal. */
async function emitClickNode(page: Page, nodeId: string): Promise<void> {
  await page.evaluate((id) => {
    const container = document.querySelector('[data-testid="sigma-canvas"]')!
    const fiberKey = Object.keys(container).find(k => k.startsWith('__reactFiber'))!
    type Fiber = { memoizedState: State | null; return: Fiber | null }
    type State = { memoizedState: unknown; next: State | null }
    let fiber = (container as Record<string, unknown>)[fiberKey] as Fiber | null
    let depth = 0
    while (fiber && depth < 40) {
      if (fiber.memoizedState) {
        let state: State | null = fiber.memoizedState
        while (state) {
          const val = state.memoizedState as Record<string, unknown> | null
          if (val && typeof val === 'object' && 'current' in val) {
            const ref = val.current as Record<string, unknown> | null
            if (ref && typeof ref.emit === 'function' && typeof ref.graphToViewport === 'function') {
              (ref.emit as (e: string, d: unknown) => void)('clickNode', {
                node: id,
                event: { original: new MouseEvent('click') },
              })
              return
            }
          }
          state = state.next
        }
      }
      fiber = fiber.return
      depth++
    }
  }, nodeId)
}

test.describe('Node Tooltip', () => {
  test('clicking a node opens tooltip with node heading', async ({ page }) => {
    await loadGraph(page, 'all-positions-graph.json')
    await emitClickNode(page, '1')

    const tooltip = page.getByTestId('node-tooltip')
    await expect(tooltip).toBeVisible()
    await expect(tooltip.getByRole('heading', { name: 'Alice' })).toBeVisible()
  })

  test('tooltip shows properties for sample graph node', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await emitClickNode(page, '1')

    const tooltip = page.getByTestId('node-tooltip')
    await expect(tooltip).toBeVisible()
    await expect(tooltip.getByRole('heading', { name: 'Alice' })).toBeVisible()
    await expect(tooltip.getByText('id: 1')).toBeVisible()
    // Check numeric property formatted with toFixed(2)
    await expect(tooltip.getByText('34.00')).toBeVisible()
    await expect(tooltip.getByText('91.50')).toBeVisible()
  })

  test('tooltip closes on Escape', async ({ page }) => {
    await loadGraph(page, 'all-positions-graph.json')
    await emitClickNode(page, '1')

    await expect(page.getByTestId('node-tooltip')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('node-tooltip')).not.toBeVisible()
  })

  test('tooltip closes on close button click', async ({ page }) => {
    await loadGraph(page, 'all-positions-graph.json')
    await emitClickNode(page, '1')

    await expect(page.getByTestId('node-tooltip')).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByTestId('node-tooltip')).not.toBeVisible()
  })

  test('tooltip shows property keys as labels', async ({ page }) => {
    await loadGraph(page, 'all-positions-graph.json')
    await emitClickNode(page, '2')

    const tooltip = page.getByTestId('node-tooltip')
    await expect(tooltip).toBeVisible()
    await expect(tooltip.getByRole('heading', { name: 'Bob' })).toBeVisible()
    await expect(tooltip.getByText('28.00')).toBeVisible()
  })
})
