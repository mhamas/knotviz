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
      nodePropertiesMetadata={undefined}
      canvasBounds={canvasBounds}
      analysisPropertyKey={null}
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
      nodePropertiesMetadata={undefined}
      canvasBounds={canvasBounds}
      analysisPropertyKey={null}
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
      nodePropertiesMetadata={undefined}
      canvasBounds={canvasBounds}
      analysisPropertyKey={null}
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
      nodePropertiesMetadata={undefined}
      canvasBounds={canvasBounds}
      analysisPropertyKey={null}
      onClose={vi.fn()}
    />,
  )
  // numbers render via formatNumber (preserves decimals as-is, no forced .00)
  await expect.element(screen.getByText('30')).toBeVisible()
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
      nodePropertiesMetadata={undefined}
      canvasBounds={canvasBounds}
      analysisPropertyKey={null}
      onClose={handler}
    />,
  )
  await screen.getByRole('button', { name: 'Close' }).click()
  expect(handler).toHaveBeenCalledOnce()
})

test('shows copy label button', async () => {
  const screen = await render(
    <NodeTooltip
      nodeId="n1"
      screenPosition={{ x: 100, y: 100 }}
      nodeIndexMap={nodeIndexMap}
      nodeLabels={nodeLabels}
      propertyColumns={propertyColumns}
      propertyMetas={metas}
      nodePropertiesMetadata={undefined}
      canvasBounds={canvasBounds}
      analysisPropertyKey={null}
      onClose={vi.fn()}
    />,
  )
  await expect.element(screen.getByRole('button', { name: 'Copy label' })).toBeVisible()
})

test('bolds the analysis property row when analysisPropertyKey is set', async () => {
  const screen = await render(
    <NodeTooltip
      nodeId="n1"
      screenPosition={{ x: 100, y: 100 }}
      nodeIndexMap={nodeIndexMap}
      nodeLabels={nodeLabels}
      propertyColumns={propertyColumns}
      propertyMetas={metas}
      nodePropertiesMetadata={undefined}
      canvasBounds={canvasBounds}
      analysisPropertyKey="age"
      onClose={vi.fn()}
    />,
  )
  // The "age" label should be bold
  const ageLabel = screen.getByText('age')
  await expect.element(ageLabel).toHaveClass('font-bold')
  // The "age" value should also be bold
  const ageValue = screen.getByText('30')
  await expect.element(ageValue).toHaveClass('font-bold')
  // The "role" label should NOT be bold
  const roleLabel = screen.getByText('role')
  await expect.element(roleLabel).toHaveClass('font-medium')
})

test('shows help popover when nodePropertiesMetadata has description', async () => {
  const screen = await render(
    <NodeTooltip
      nodeId="n1"
      screenPosition={{ x: 100, y: 100 }}
      nodeIndexMap={nodeIndexMap}
      nodeLabels={nodeLabels}
      propertyColumns={propertyColumns}
      propertyMetas={metas}
      nodePropertiesMetadata={{ age: { description: 'Age in years' } }}
      canvasBounds={canvasBounds}
      analysisPropertyKey={null}
      onClose={vi.fn()}
    />,
  )
  // The HelpPopover renders a button with aria-label containing "?"
  const helpButtons = screen.container.querySelectorAll('[data-slot="popover-trigger"]')
  expect(helpButtons.length).toBeGreaterThanOrEqual(1)
})

test('formats numbers with adaptive precision (2 decimals when |x|>=1, 6 otherwise)', async () => {
  const numericColumns: PropertyColumns = {
    big: [42.123456, undefined],
    small: [0.123456789, undefined],
    wide: [1234567.89, undefined],
    tiny_integral: [0.5, undefined],
  }
  const numericMetas: PropertyMeta[] = [
    { key: 'big', type: 'number' },
    { key: 'small', type: 'number' },
    { key: 'wide', type: 'number' },
    { key: 'tiny_integral', type: 'number' },
  ]
  const screen = await render(
    <NodeTooltip
      nodeId="n1"
      screenPosition={{ x: 100, y: 100 }}
      nodeIndexMap={nodeIndexMap}
      nodeLabels={nodeLabels}
      propertyColumns={numericColumns}
      propertyMetas={numericMetas}
      nodePropertiesMetadata={undefined}
      canvasBounds={canvasBounds}
      analysisPropertyKey={null}
      onClose={vi.fn()}
    />,
  )
  // |x|>=1 → cap at 2 decimals (exact match via anchored regex)
  await expect.element(screen.getByText(/^42\.12$/)).toBeVisible()
  await expect.element(screen.getByText(/^1,234,567\.89$/)).toBeVisible()
  // |x|<1 → keep 6-decimal cap for precision
  await expect.element(screen.getByText(/^0\.123457$/)).toBeVisible()
  // |x|<1 but already short — no padding
  await expect.element(screen.getByText(/^0\.5$/)).toBeVisible()
})

test('shows Failed indicator when clipboard write rejects', async () => {
  const originalWriteText = navigator.clipboard.writeText
  Object.defineProperty(navigator.clipboard, 'writeText', {
    value: () => Promise.reject(new Error('clipboard blocked')),
    configurable: true,
    writable: true,
  })
  try {
    const screen = await render(
      <NodeTooltip
        nodeId="n1"
        screenPosition={{ x: 100, y: 100 }}
        nodeIndexMap={nodeIndexMap}
        nodeLabels={nodeLabels}
        propertyColumns={propertyColumns}
        propertyMetas={metas}
        nodePropertiesMetadata={undefined}
        canvasBounds={canvasBounds}
        analysisPropertyKey={null}
        onClose={vi.fn()}
      />,
    )
    await screen.getByRole('button', { name: 'Copy node ID' }).click()
    await expect.element(screen.getByText('Failed')).toBeVisible()
  } finally {
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: originalWriteText,
      configurable: true,
      writable: true,
    })
  }
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
      nodePropertiesMetadata={undefined}
      canvasBounds={canvasBounds}
      analysisPropertyKey={null}
      onClose={vi.fn()}
    />,
  )
  await expect.element(screen.getByText('No properties')).toBeVisible()
})
