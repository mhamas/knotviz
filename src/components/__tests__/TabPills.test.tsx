import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { TabPills } from '@/components/sidebar'

const tabs = [
  { id: 'filters', label: 'Filters' },
  { id: 'stats', label: 'Stats' },
  { id: 'color', label: 'Color' },
]

test('renders all tab labels', async () => {
  const screen = await render(
    <TabPills tabs={tabs} activeTab="filters" onTabChange={vi.fn()} />,
  )
  await expect.element(screen.getByText('Filters')).toBeVisible()
  await expect.element(screen.getByText('Stats')).toBeVisible()
  await expect.element(screen.getByText('Color')).toBeVisible()
})

test('active tab has aria-selected true', async () => {
  const screen = await render(
    <TabPills tabs={tabs} activeTab="stats" onTabChange={vi.fn()} />,
  )
  await expect.element(screen.getByRole('tab', { name: 'Stats' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect.element(screen.getByRole('tab', { name: 'Filters' })).toHaveAttribute(
    'aria-selected',
    'false',
  )
})

test('clicking non-active tab calls onTabChange', async () => {
  const handler = vi.fn()
  const screen = await render(
    <TabPills tabs={tabs} activeTab="filters" onTabChange={handler} />,
  )
  await screen.getByText('Stats').click()
  expect(handler).toHaveBeenCalledWith('stats')
})
