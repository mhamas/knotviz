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
  scaleMode: 'linear',
  histogramBuckets: numBuckets,
  logHistogramBuckets: numBuckets,
  quantiles: new Float64Array(101),
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

test('number filter shows histogram toggle and scale expander in header', async () => {
  const meta: PropertyMeta = { key: 'score', type: 'number' }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={numberState}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
      onScaleModeChange={vi.fn()}
    />,
  )
  await expect.element(screen.getByTestId('number-filter-histogram-toggle')).toBeVisible()
  await expect.element(screen.getByTestId('number-filter-scale-expander')).toBeVisible()
})

test('scale row hidden by default; expander click reveals lin/log/% buttons', async () => {
  const meta: PropertyMeta = { key: 'score', type: 'number' }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={numberState}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
      onScaleModeChange={vi.fn()}
    />,
  )
  // Hidden initially
  expect(screen.container.querySelector('[data-testid="number-filter-scale-row"]')).toBeNull()
  // Click expander → scale row appears
  await screen.getByTestId('number-filter-scale-expander').click()
  expect(screen.container.querySelector('[data-testid="number-filter-scale-row"]')).not.toBeNull()
  await expect.element(screen.getByTestId('number-filter-scale-mode-linear')).toBeVisible()
  await expect.element(screen.getByTestId('number-filter-scale-mode-log')).toBeVisible()
  await expect.element(screen.getByTestId('number-filter-scale-mode-percentile')).toBeVisible()
})

test('clicking a mode button calls onScaleModeChange with that mode', async () => {
  const meta: PropertyMeta = { key: 'score', type: 'number' }
  const onScaleModeChange = vi.fn()
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={numberState}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
      onScaleModeChange={onScaleModeChange}
    />,
  )
  await screen.getByTestId('number-filter-scale-expander').click()
  await screen.getByTestId('number-filter-scale-mode-percentile').click()
  expect(onScaleModeChange).toHaveBeenCalledWith('percentile')
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
  expect(screen.container.querySelector('[data-testid="number-filter-histogram"]')).toBeNull()
  await screen.getByTestId('number-filter-histogram-toggle').click()
  expect(screen.container.querySelector('[data-testid="number-filter-histogram"]')).not.toBeNull()
})

test('log mode button disabled when domain has negative values', async () => {
  const meta: PropertyMeta = { key: 'score', type: 'number' }
  const state: NumberFilterState = { ...numberState, domainMin: -10, logHistogramBuckets: [] }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={state}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
      onScaleModeChange={vi.fn()}
    />,
  )
  await screen.getByTestId('number-filter-scale-expander').click()
  await expect.element(screen.getByTestId('number-filter-scale-mode-log')).toBeDisabled()
})

test('percentile mode button disabled when no quantiles are available', async () => {
  const meta: PropertyMeta = { key: 'score', type: 'number' }
  const state: NumberFilterState = { ...numberState, quantiles: new Float64Array(0) }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={state}
      onEnabledChange={vi.fn()}
      onNumberChange={vi.fn()}
      onScaleModeChange={vi.fn()}
    />,
  )
  await screen.getByTestId('number-filter-scale-expander').click()
  await expect.element(screen.getByTestId('number-filter-scale-mode-percentile')).toBeDisabled()
})

test('boolean filter does not show histogram toggle or scale expander', async () => {
  const meta: PropertyMeta = { key: 'active', type: 'boolean' }
  const screen = await render(
    <PropertyFilterPanel
      meta={meta}
      filterState={{ type: 'boolean', isEnabled: true, selected: true } as BooleanFilterState}
      onEnabledChange={vi.fn()}
      onBooleanChange={vi.fn()}
    />,
  )
  expect(screen.container.querySelector('[data-testid="number-filter-scale-expander"]')).toBeNull()
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
