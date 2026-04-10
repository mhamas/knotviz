import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { PropertyFilterPanel } from '@/components/filters/PropertyFilterPanel'
import type { NumberFilterState, BooleanFilterState, PropertyMeta, HistogramBucket } from '@/types'

const numBuckets: HistogramBucket[] = [
  { from: 0, to: 50, count: 3 },
  { from: 50, to: 100, count: 2 },
]

const numberState: NumberFilterState = {
  type: 'number',
  isEnabled: false,
  min: 0,
  max: 100,
  domainMin: 0,
  domainMax: 100,
  isLogScale: false,
  histogramBuckets: numBuckets,
  logHistogramBuckets: numBuckets,
}

test('renders property name and type badge', async () => {
  const meta: PropertyMeta = { key: 'age', type: 'number' }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={numberState}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
    />,
  )
  await expect.element(screen.getByText('age')).toBeVisible()
  await expect.element(screen.getByText('number')).toBeVisible()
})

test('number filter shows log and histogram toggles in header', async () => {
  const meta: PropertyMeta = { key: 'score', type: 'number' }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={numberState}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
      onLogScaleChange={vi.fn()}
    />,
  )
  await expect.element(screen.getByTestId('number-filter-log-toggle')).toBeVisible()
  await expect.element(screen.getByTestId('number-filter-histogram-toggle')).toBeVisible()
})

test('log toggle calls onLogScaleChange', async () => {
  const meta: PropertyMeta = { key: 'score', type: 'number' }
  const onLogScaleChange = vi.fn()
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={numberState}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
      onLogScaleChange={onLogScaleChange}
    />,
  )
  await screen.getByTestId('number-filter-log-toggle').click()
  expect(onLogScaleChange).toHaveBeenCalledWith(true)
})

test('histogram toggle shows histogram below slider', async () => {
  const meta: PropertyMeta = { key: 'score', type: 'number' }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={{ ...numberState, isEnabled: true }}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
    />,
  )
  // Hidden by default
  expect(screen.container.querySelector('[data-testid="number-filter-histogram"]')).toBeNull()
  await screen.getByTestId('number-filter-histogram-toggle').click()
  expect(screen.container.querySelector('[data-testid="number-filter-histogram"]')).not.toBeNull()
})

test('log toggle disabled when domain has negative values', async () => {
  const meta: PropertyMeta = { key: 'score', type: 'number' }
  const state: NumberFilterState = { ...numberState, domainMin: -10, logHistogramBuckets: [] }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={state}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
      onLogScaleChange={vi.fn()}
    />,
  )
  await expect.element(screen.getByTestId('number-filter-log-toggle')).toBeDisabled()
})

test('boolean filter does not show log or histogram toggles', async () => {
  const meta: PropertyMeta = { key: 'active', type: 'boolean' }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={{ type: 'boolean', isEnabled: true, selected: true } as BooleanFilterState}
      onEnabledChange={vi.fn()}
      onBooleanChange={vi.fn()}
    />,
  )
  expect(screen.container.querySelector('[data-testid="number-filter-log-toggle"]')).toBeNull()
  expect(screen.container.querySelector('[data-testid="number-filter-histogram-toggle"]')).toBeNull()
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

test('shows help popover when description is provided', async () => {
  const meta: PropertyMeta = { key: 'age', type: 'number' }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      description="Age in years"
      filterState={numberState}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
    />,
  )
  const helpTriggers = screen.container.querySelectorAll('[data-slot="popover-trigger"]')
  expect(helpTriggers.length).toBeGreaterThanOrEqual(1)
})

test('does not show help popover when description is absent', async () => {
  const meta: PropertyMeta = { key: 'age', type: 'number' }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={numberState}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
    />,
  )
  const helpTriggers = screen.container.querySelectorAll('[data-slot="popover-trigger"]')
  expect(helpTriggers.length).toBe(0)
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
