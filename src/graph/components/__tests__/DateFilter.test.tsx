import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { DateFilter } from '@/components/filters/DateFilter'
import type { DateFilterState } from '@/types'

const baseState: DateFilterState = {
  type: 'date',
  isEnabled: true,
  after: '2020-01-01',
  before: '2024-12-31',
  domainMin: '2020-01-01',
  domainMax: '2024-12-31',
  isLogScale: false,
  histogramBuckets: [
    { from: '2020-01-01', to: '2022-06-15', count: 3 },
    { from: '2022-06-15', to: '2024-12-31', count: 5 },
  ],
  logHistogramBuckets: [
    { from: '2020-01-01', to: '2023-01-01', count: 2 },
    { from: '2023-01-01', to: '2024-12-31', count: 6 },
  ],
}

test('renders date range labels', async () => {
  const screen = await render(
    <DateFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
  )
  await expect.element(screen.getByTestId('date-filter-min')).toHaveTextContent('2020-01-01')
  await expect.element(screen.getByTestId('date-filter-max')).toHaveTextContent('2024-12-31')
})

test('renders slider track', async () => {
  const screen = await render(
    <DateFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
  )
  expect(screen.container.querySelector('[data-slot="slider"]')).not.toBeNull()
})

test('histogram hidden by default, visible when isHistogramVisible is true', async () => {
  const screen = await render(
    <DateFilter state={baseState} onChange={vi.fn()} isHistogramVisible={false} />,
  )
  expect(screen.container.querySelector('[data-testid="date-filter-histogram"]')).toBeNull()

  const { container } = await render(
    <DateFilter state={baseState} onChange={vi.fn()} isHistogramVisible={true} />,
  )
  expect(container.querySelector('[data-testid="date-filter-histogram"]')).not.toBeNull()
})

test('switches to log-scale histogram when isLogScale is true', async () => {
  const logState: DateFilterState = { ...baseState, isLogScale: true }
  const { container } = await render(
    <DateFilter state={logState} onChange={vi.fn()} isHistogramVisible={true} />,
  )
  // The log-scale histogram has 2 buckets with counts [2, 6] — renders 2 bars.
  const bars = container.querySelectorAll('[data-testid="histogram-bar"]')
  expect(bars.length).toBe(2)
})
