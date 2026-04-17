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

test('dropdown opens when input is focused and there are matches', async () => {
  const matches = [
    { id: '1', label: 'Alice' },
    { id: '3', label: 'Carol' },
  ]
  const screen = await render(
    <SearchBox initialValue="a" matchCount={2} matches={matches} onChange={vi.fn()} />,
  )
  await screen.getByTestId('search-box-input').click() // focus
  await expect.element(screen.getByTestId('search-box-dropdown')).toBeVisible()
  const options = screen.getByTestId('search-box-option').elements()
  expect(options.length).toBe(2)
  expect(options[0].textContent).toContain('Alice')
  expect(options[1].textContent).toContain('Carol')
})

test('dropdown is hidden when input is empty', async () => {
  const matches = [{ id: '1', label: 'Alice' }]
  const screen = await render(
    <SearchBox initialValue="" matchCount={null} matches={matches} onChange={vi.fn()} />,
  )
  await screen.getByTestId('search-box-input').click()
  const elements = screen.getByTestId('search-box-dropdown').elements()
  expect(elements.length).toBe(0)
})

test('dropdown is hidden when there are no matches', async () => {
  const screen = await render(
    <SearchBox initialValue="zzz" matchCount={0} matches={[]} onChange={vi.fn()} />,
  )
  await screen.getByTestId('search-box-input').click()
  const elements = screen.getByTestId('search-box-dropdown').elements()
  expect(elements.length).toBe(0)
})

test('clicking an option fills the input with its label and calls onChange', async () => {
  const handler = vi.fn()
  const matches = [
    { id: '1', label: 'Alice' },
    { id: '3', label: 'Carol' },
  ]
  const screen = await render(
    <SearchBox initialValue="a" matchCount={2} matches={matches} onChange={handler} />,
  )
  await screen.getByTestId('search-box-input').click()
  await screen.getByTestId('search-box-option').nth(1).click()
  await expect.element(screen.getByTestId('search-box-input')).toHaveValue('Carol')
  expect(handler).toHaveBeenLastCalledWith('Carol')
})

test('clicking an option with empty label falls back to the id', async () => {
  const handler = vi.fn()
  const matches = [{ id: 'node-xyz', label: '' }]
  const screen = await render(
    <SearchBox initialValue="node" matchCount={1} matches={matches} onChange={handler} />,
  )
  await screen.getByTestId('search-box-input').click()
  await screen.getByTestId('search-box-option').click()
  await expect.element(screen.getByTestId('search-box-input')).toHaveValue('node-xyz')
  expect(handler).toHaveBeenLastCalledWith('node-xyz')
})

test('dropdown footer shows "N of M" when matchCount exceeds the sample size', async () => {
  // 3 samples returned but matchCount=400 → dropdown is a partial view
  const matches = [
    { id: '1', label: 'Alice' },
    { id: '2', label: 'Bob' },
    { id: '3', label: 'Carol' },
  ]
  const screen = await render(
    <SearchBox initialValue="a" matchCount={400} matches={matches} onChange={vi.fn()} />,
  )
  await screen.getByTestId('search-box-input').click()
  await expect
    .element(screen.getByTestId('search-box-dropdown-footer'))
    .toHaveTextContent('Showing 3 of 400 matches')
})

test('dropdown footer is absent when every match fits in the dropdown', async () => {
  const matches = [{ id: '1', label: 'Alice' }]
  const screen = await render(
    <SearchBox initialValue="a" matchCount={1} matches={matches} onChange={vi.fn()} />,
  )
  await screen.getByTestId('search-box-input').click()
  const elements = screen.getByTestId('search-box-dropdown-footer').elements()
  expect(elements.length).toBe(0)
})

test('long option labels truncate and expose the full text via the title tooltip', async () => {
  const long = 'Supercalifragilisticexpialidocious Name That Exceeds The Sidebar Width'
  const matches = [{ id: '42', label: long }]
  const screen = await render(
    <SearchBox initialValue="super" matchCount={1} matches={matches} onChange={vi.fn()} />,
  )
  await screen.getByTestId('search-box-input').click()
  const option = screen.getByTestId('search-box-option').element() as HTMLElement
  expect(option.title).toBe(long)
  expect(option.className).toContain('truncate')
})

test('dropdown is hidden when the component is disabled', async () => {
  const matches = [{ id: '1', label: 'Alice' }]
  const screen = await render(
    <SearchBox initialValue="a" matchCount={1} matches={matches} onChange={vi.fn()} disabled />,
  )
  const elements = screen.getByTestId('search-box-dropdown').elements()
  expect(elements.length).toBe(0)
})
