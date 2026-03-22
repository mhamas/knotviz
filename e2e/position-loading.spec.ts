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

test.describe('Position-Aware Loading', () => {
  test('no warning when all nodes have positions', async ({ page }) => {
    await loadGraph(page, 'all-positions-graph.json')
    await expect(page.getByText('positions were randomized')).not.toBeVisible()
  })

  // Reading positions back requires Cosmos GPU pipeline (not available in SwiftShader)
  test.skip('preserves input positions when all nodes have x/y', async ({ page }) => {
    await loadGraph(page, 'all-positions-graph.json')

    const positions = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="sigma-canvas"]')!
      const fiberKey = Object.keys(container).find(k => k.startsWith('__reactFiber'))!
      let fiber = (container as any)[fiberKey]
      let depth = 0
      while (fiber && depth < 40) {
        if (fiber.memoizedState) {
          let state = fiber.memoizedState
          while (state) {
            const val = state.memoizedState
            if (val && typeof val === 'object' && 'current' in val) {
              const ref = val.current
              if (ref && ref.settings && ref.worker) {
                const graph = ref.graph
                return graph.nodes().map((n: string) => ({
                  id: n,
                  x: graph.getNodeAttribute(n, 'x'),
                  y: graph.getNodeAttribute(n, 'y'),
                }))
              }
            }
            state = state.next
          }
        }
        fiber = fiber.return
        depth++
      }
      return null
    })

    expect(positions).not.toBeNull()
    expect(positions).toEqual([
      { id: '1', x: 0, y: 0 },
      { id: '2', x: 100, y: 0 },
      { id: '3', x: 50, y: 86 },
    ])
  })

  test('shows warning when some nodes have positions', async ({ page }) => {
    await loadGraph(page, 'partial-positions-graph.json')
    await expect(page.getByText('positions were randomized')).toBeVisible()
  })

  test('no warning when no nodes have positions', async ({ page }) => {
    await loadGraph(page, 'sample-graph.json')
    await expect(page.getByText('positions were randomized')).not.toBeVisible()
  })
})
