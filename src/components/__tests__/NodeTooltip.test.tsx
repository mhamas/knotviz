import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { NodeTooltip } from '@/components/NodeTooltip'
import type { GraphData, PropertyMeta } from '@/types'

const graphData: GraphData = {
  version: '1',
  nodes: [
    {
      id: 'n1',
      label: 'Alice',
      properties: { age: 30, role: 'admin', active: true },
    },
    { id: 'n2' },
  ],
  edges: [],
}

const metas: PropertyMeta[] = [
  { key: 'age', type: 'number' },
  { key: 'role', type: 'string' },
  { key: 'active', type: 'boolean' },
]

const canvasBounds = new DOMRect(0, 0, 800, 600)

test('renders node label as heading', async () => {
  const screen = await render(
    <NodeTooltip
      nodeId="n1"
      screenPosition={{ x: 100, y: 100 }}
      graphData={graphData}
      propertyMetas={metas}
      canvasBounds={canvasBounds}
      onClose={vi.fn()}
    />,
  )
  await expect.element(screen.getByText('Alice')).toBeVisible()
})

test('shows copy button for node ID', async () => {
  const screen = await render(
    <NodeTooltip
      nodeId="n1"
      screenPosition={{ x: 100, y: 100 }}
      graphData={graphData}
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
      graphData={graphData}
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
      graphData={graphData}
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
      graphData={graphData}
      propertyMetas={[]}
      canvasBounds={canvasBounds}
      onClose={vi.fn()}
    />,
  )
  await expect.element(screen.getByText('No properties')).toBeVisible()
})
