import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { NodeTooltip } from '@/components/NodeTooltip'
import type { PropertyMeta } from '@/types'
import type { PropertyColumns } from '@/hooks/useFilterState'

const nodeIndexMap = new Map([['n1', 0], ['n2', 1]])
const nodeLabels: (string | undefined)[] = ['Alice', undefined]
const propertyColumns: PropertyColumns = {
  age: [30, undefined],
  role: ['admin', undefined],
  active: [true, undefined],
}

const metas: PropertyMeta[] = [
  { key: 'age', type: 'number' },
  { key: 'role', type: 'string' },
  { key: 'active', type: 'boolean' },
]

const canvasBounds = new DOMRect(0, 0, 800, 600)

test('renders node label as heading and shows ID below', async () => {
  const screen = await render(
    <NodeTooltip
      nodeId="n1"
      screenPosition={{ x: 100, y: 100 }}
      nodeIndexMap={nodeIndexMap}
      nodeLabels={nodeLabels}
      propertyColumns={propertyColumns}
      propertyMetas={metas}
      canvasBounds={canvasBounds}
      onClose={vi.fn()}
    />,
  )
  await expect.element(screen.getByText('Alice')).toBeVisible()
  await expect.element(screen.getByTestId('node-tooltip-id')).toHaveTextContent('n1')
})

test('shows ID as both label and ID when node has no explicit label', async () => {
  const screen = await render(
    <NodeTooltip
      nodeId="n2"
      screenPosition={{ x: 100, y: 100 }}
      nodeIndexMap={nodeIndexMap}
      nodeLabels={nodeLabels}
      propertyColumns={propertyColumns}
      propertyMetas={metas}
      canvasBounds={canvasBounds}
      onClose={vi.fn()}
    />,
  )
  // Heading should show the ID as label
  await expect.element(screen.getByRole('heading', { name: 'n2' })).toBeVisible()
  // ID line should also show the same ID
  await expect.element(screen.getByTestId('node-tooltip-id')).toHaveTextContent('n2')
})

test('shows copy button for node ID', async () => {
  const screen = await render(
    <NodeTooltip
      nodeId="n1"
      screenPosition={{ x: 100, y: 100 }}
      nodeIndexMap={nodeIndexMap}
      nodeLabels={nodeLabels}
      propertyColumns={propertyColumns}
      propertyMetas={metas}
      canvasBounds={canvasBounds}
      onClose={vi.fn()}
    />,
  )
  await expect.element(screen.getByRole('button', { name: 'Copy node ID' })).toBeVisible()
})

test('shows formatted properties', async () => {
  const screen = await render(
    <NodeTooltip
      nodeId="n1"
      screenPosition={{ x: 100, y: 100 }}
      nodeIndexMap={nodeIndexMap}
      nodeLabels={nodeLabels}
      propertyColumns={propertyColumns}
      propertyMetas={metas}
      canvasBounds={canvasBounds}
      onClose={vi.fn()}
    />,
  )
  // number formatted with toFixed(2)
  await expect.element(screen.getByText('30.00')).toBeVisible()
  await expect.element(screen.getByText('admin')).toBeVisible()
  await expect.element(screen.getByText('true')).toBeVisible()
})

test('close button calls onClose', async () => {
  const handler = vi.fn()
  const screen = await render(
    <NodeTooltip
      nodeId="n1"
      screenPosition={{ x: 100, y: 100 }}
      nodeIndexMap={nodeIndexMap}
      nodeLabels={nodeLabels}
      propertyColumns={propertyColumns}
      propertyMetas={metas}
      canvasBounds={canvasBounds}
      onClose={handler}
    />,
  )
  await screen.getByRole('button', { name: 'Close' }).click()
  expect(handler).toHaveBeenCalledOnce()
})

test('shows No properties when no metas', async () => {
  const screen = await render(
    <NodeTooltip
      nodeId="n2"
      screenPosition={{ x: 100, y: 100 }}
      nodeIndexMap={nodeIndexMap}
      nodeLabels={nodeLabels}
      propertyColumns={propertyColumns}
      propertyMetas={[]}
      canvasBounds={canvasBounds}
      onClose={vi.fn()}
    />,
  )
  await expect.element(screen.getByText('No properties')).toBeVisible()
})
