import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { PropertyFilterPanel } from '@/components/filters/PropertyFilterPanel'
import type { NumberFilterState, BooleanFilterState, PropertyMeta } from '@/types'

test('renders property name and type badge', async () => {
  const meta: PropertyMeta = { key: 'age', type: 'number' }
  const filterState: NumberFilterState = {
    type: 'number',
    isEnabled: false,
    min: 0,
    max: 100,
    domainMin: 0,
    domainMax: 100,
    isLogScale: false,
    histogramBuckets: [],
    logHistogramBuckets: [],
  }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={filterState}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
    />,
  )
  await expect.element(screen.getByText('age')).toBeVisible()
  await expect.element(screen.getByText('number')).toBeVisible()
})

test('body is dimmed when disabled', async () => {
  const meta: PropertyMeta = { key: 'active', type: 'boolean' }
  const filterState: BooleanFilterState = {
    type: 'boolean',
    isEnabled: false,
    selected: true,
  }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={filterState}
      onEnabledChange={vi.fn()}
      onBooleanChange={vi.fn()}
    />,
  )
  const body = screen.container.querySelector('.opacity-30')
  expect(body).not.toBeNull()
})

test('body is not dimmed when enabled', async () => {
  const meta: PropertyMeta = { key: 'active', type: 'boolean' }
  const filterState: BooleanFilterState = {
    type: 'boolean',
    isEnabled: true,
    selected: true,
  }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={filterState}
      onEnabledChange={vi.fn()}
      onBooleanChange={vi.fn()}
    />,
  )
  const body = screen.container.querySelector('.opacity-30')
  expect(body).toBeNull()
})

test('renders correct sub-filter for boolean type', async () => {
  const meta: PropertyMeta = { key: 'active', type: 'boolean' }
  const filterState: BooleanFilterState = {
    type: 'boolean',
    isEnabled: true,
    selected: true,
  }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={filterState}
      onEnabledChange={vi.fn()}
      onBooleanChange={vi.fn()}
    />,
  )
  expect(screen.getByTestId('boolean-filter')).toBeDefined()
})
