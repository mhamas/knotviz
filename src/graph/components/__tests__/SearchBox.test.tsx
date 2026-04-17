import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { SearchBox } from '@/components/filters/SearchBox'

test('renders input with placeholder and initial value', async () => {
  const screen = await render(
    <SearchBox initialValue="alice" matchCount={null} onChange={vi.fn()} />,
  )
  const input = screen.getByTestId('search-box-input')
  await expect.element(input).toBeVisible()
  await expect.element(input).toHaveValue('alice')
})

test('typing updates input and calls onChange', async () => {
  const handler = vi.fn()
  const screen = await render(
    <SearchBox initialValue="" matchCount={null} onChange={handler} />,
  )
  const input = screen.getByTestId('search-box-input')
  await input.fill('bob')
  await expect.element(input).toHaveValue('bob')
  expect(handler).toHaveBeenCalledWith('bob')
})

test('clear button clears input and calls onChange with empty string', async () => {
  const handler = vi.fn()
  const screen = await render(
    <SearchBox initialValue="hello" matchCount={3} onChange={handler} />,
  )
  await screen.getByTestId('search-box-clear').click()
  await expect.element(screen.getByTestId('search-box-input')).toHaveValue('')
  expect(handler).toHaveBeenCalledWith('')
})

test('clear button is hidden when input is empty', async () => {
  const screen = await render(
    <SearchBox initialValue="" matchCount={null} onChange={vi.fn()} />,
  )
  // Query-by-testid that returns a locator; check count is 0
  const clearLocators = screen.getByTestId('search-box-clear').elements()
  expect(clearLocators.length).toBe(0)
})

test('shows match count when a search is active', async () => {
  const screen = await render(
    <SearchBox initialValue="foo" matchCount={42} onChange={vi.fn()} />,
  )
  await expect.element(screen.getByTestId('search-box-count')).toHaveTextContent('42 matches')
})

test('shows "No matches" when matchCount is 0', async () => {
  const screen = await render(
    <SearchBox initialValue="xyz" matchCount={0} onChange={vi.fn()} />,
  )
  await expect.element(screen.getByTestId('search-box-count')).toHaveTextContent('No matches')
})

test('shows "1 match" (singular) when matchCount is 1', async () => {
  const screen = await render(
    <SearchBox initialValue="x" matchCount={1} onChange={vi.fn()} />,
  )
  await expect.element(screen.getByTestId('search-box-count')).toHaveTextContent('1 match')
})

test('hides match count when matchCount is null (no active search)', async () => {
  const screen = await render(
    <SearchBox initialValue="" matchCount={null} onChange={vi.fn()} />,
  )
  const elements = screen.getByTestId('search-box-count').elements()
  expect(elements.length).toBe(0)
})

test('when disabled, input has the disabled attribute', async () => {
  const screen = await render(
    <SearchBox initialValue="" matchCount={null} onChange={vi.fn()} disabled />,
  )
  const input = screen.getByTestId('search-box-input').element() as HTMLInputElement
  expect(input.disabled).toBe(true)
})

test('when disabled, the clear button is hidden even if the value is non-empty', async () => {
  const screen = await render(
    <SearchBox initialValue="hello" matchCount={null} onChange={vi.fn()} disabled />,
  )
  const elements = screen.getByTestId('search-box-clear').elements()
  expect(elements.length).toBe(0)
})

test('when disabled, match count is not shown', async () => {
  // Even if a parent mistakenly passes a count, disabled means "no graph" →
  // we refuse to show a misleading number.
  const screen = await render(
    <SearchBox initialValue="" matchCount={5} onChange={vi.fn()} disabled />,
  )
  const elements = screen.getByTestId('search-box-count').elements()
  expect(elements.length).toBe(0)
})
