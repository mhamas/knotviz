import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { NumberFilter } from '@/components/filters/NumberFilter'
import type { NumberFilterState } from '@/types'

const baseState: NumberFilterState = {
  type: 'number',
  isEnabled: true,
  min: 0,
  max: 100,
  domainMin: 0,
  domainMax: 100,
}

test('renders slider with min and max labels', async () => {
  const screen = await render(
    <NumberFilter state={baseState} onChange={vi.fn()} />,
  )
  await expect.element(screen.getByTestId('number-filter-min')).toHaveTextContent('0')
  await expect.element(screen.getByTestId('number-filter-max')).toHaveTextContent('100.00')
})

test('renders slider track', async () => {
  const screen = await render(
    <NumberFilter state={baseState} onChange={vi.fn()} />,
  )
  expect(screen.container.querySelector('[data-slot="slider"]')).not.toBeNull()
})

test('renders with small values using toPrecision', async () => {
  const state: NumberFilterState = {
    ...baseState,
    min: 0.001,
    max: 0.009,
    domainMin: 0.001,
    domainMax: 0.009,
  }
  const screen = await render(
    <NumberFilter state={state} onChange={vi.fn()} />,
  )
  await expect.element(screen.getByTestId('number-filter-min')).toHaveTextContent('0.00100')
  await expect.element(screen.getByTestId('number-filter-max')).toHaveTextContent('0.00900')
})
