import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { BooleanFilter } from '@/components/filters/BooleanFilter'
import type { BooleanFilterState } from '@/types'

const baseState: BooleanFilterState = {
  type: 'boolean',
  isEnabled: true,
  selected: true,
}

test('renders True and False radio buttons', async () => {
  const screen = await render(
    <BooleanFilter state={baseState} onChange={vi.fn()} />,
  )
  await expect.element(screen.getByText('True')).toBeVisible()
  await expect.element(screen.getByText('False')).toBeVisible()
})

test('calls onChange with false when False clicked', async () => {
  const handler = vi.fn()
  const screen = await render(
    <BooleanFilter state={baseState} onChange={handler} />,
  )
  await screen.getByText('False').click()
  expect(handler).toHaveBeenCalledWith(false)
})

test('calls onChange with true when True clicked', async () => {
  const handler = vi.fn()
  const state: BooleanFilterState = { ...baseState, selected: false }
  const screen = await render(
    <BooleanFilter state={state} onChange={handler} />,
  )
  await screen.getByText('True').click()
  expect(handler).toHaveBeenCalledWith(true)
})
