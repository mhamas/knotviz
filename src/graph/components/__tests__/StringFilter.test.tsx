import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { StringFilter } from '@/components/filters/StringFilter'
import type { StringFilterState } from '@/types'

function makeState(overrides?: Partial<StringFilterState>): StringFilterState {
  return {
    type: 'string',
    isEnabled: true,
    selectedValues: new Set<string>(),
    allValues: ['admin', 'editor', 'user', 'viewer'],
    ...overrides,
  }
}

test('renders search input and count', async () => {
  const screen = await render(
    <StringFilter state={makeState()} onChange={vi.fn()} />,
  )
  await expect.element(screen.getByTestId('string-filter-search')).toBeVisible()
  await expect.element(screen.getByTestId('string-filter-count')).toHaveTextContent('4/4')
})

test('select all calls onChange with all values', async () => {
  const handler = vi.fn()
  const screen = await render(
    <StringFilter state={makeState()} onChange={handler} />,
  )
  await screen.getByTestId('string-filter-select-all').click()
  expect(handler).toHaveBeenCalledWith(
    new Set(['admin', 'editor', 'user', 'viewer']),
  )
})

test('clear all calls onChange with empty set', async () => {
  const handler = vi.fn()
  const state = makeState({
    selectedValues: new Set(['admin', 'user']),
  })
  const screen = await render(
    <StringFilter state={state} onChange={handler} />,
  )
  await screen.getByTestId('string-filter-deselect-all').click()
  expect(handler).toHaveBeenCalledWith(new Set())
})

test('shows count for selected values', async () => {
  const state = makeState({
    selectedValues: new Set(['admin', 'user']),
  })
  const screen = await render(
    <StringFilter state={state} onChange={vi.fn()} />,
  )
  await expect.element(screen.getByTestId('string-filter-count')).toHaveTextContent('2/4')
})

test('renders chips for selected values', async () => {
  const state = makeState({
    selectedValues: new Set(['admin', 'user']),
  })
  const screen = await render(
    <StringFilter state={state} onChange={vi.fn()} />,
  )
  const chips = screen.container.querySelectorAll('[data-testid="string-filter-chip"]')
  expect(chips.length).toBe(2)
})

test('clicking a chip removes it', async () => {
  const handler = vi.fn()
  const state = makeState({
    selectedValues: new Set(['admin', 'user']),
  })
  const screen = await render(
    <StringFilter state={state} onChange={handler} />,
  )
  const chips = screen.container.querySelectorAll('[data-testid="string-filter-chip"]')
  ;(chips[0] as HTMLElement).click()
  expect(handler).toHaveBeenCalledWith(new Set(['user']))
})

test('typing in search shows dropdown with prefix matches', async () => {
  const screen = await render(
    <StringFilter state={makeState()} onChange={vi.fn()} />,
  )
  const input = screen.getByTestId('string-filter-search')
  await input.click()
  await input.fill('ad')
  await expect.element(screen.getByTestId('string-filter-dropdown')).toBeVisible()
  const options = screen.container.querySelectorAll('[data-testid="string-filter-option"]')
  expect(options.length).toBe(1)
  expect(options[0].textContent).toBe('admin')
})

test('selecting a dropdown option adds it to selection', async () => {
  const handler = vi.fn()
  const screen = await render(
    <StringFilter state={makeState()} onChange={handler} />,
  )
  const input = screen.getByTestId('string-filter-search')
  await input.click()
  await input.fill('u')
  // mousedown on option selects it
  const option = screen.getByTestId('string-filter-option')
  await option.click()
  expect(handler).toHaveBeenCalledWith(new Set(['user']))
})

test('shows overflow indicator when many chips selected', async () => {
  // MAX_VISIBLE_CHIPS is 8, create 10 values
  const allValues = Array.from({ length: 10 }, (_, i) => `val-${i}`)
  const state = makeState({
    allValues,
    selectedValues: new Set(allValues),
  })
  const screen = await render(
    <StringFilter state={state} onChange={vi.fn()} />,
  )
  await expect.element(screen.getByTestId('string-filter-overflow')).toHaveTextContent('+2 more')
})
