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
}

test('renders date range labels', async () => {
  const screen = await render(
    <DateFilter state={baseState} onChange={vi.fn()} />,
  )
  await expect.element(screen.getByTestId('date-filter-min')).toHaveTextContent('2020-01-01')
  await expect.element(screen.getByTestId('date-filter-max')).toHaveTextContent('2024-12-31')
})

test('renders slider track', async () => {
  const screen = await render(
    <DateFilter state={baseState} onChange={vi.fn()} />,
  )
  expect(screen.container.querySelector('[data-slot="slider"]')).not.toBeNull()
})
