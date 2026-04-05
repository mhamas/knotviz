import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { SidebarCheckbox } from '@/components/sidebar'

test('renders label text', async () => {
  const screen = await render(
    <SidebarCheckbox label="Show edges" checked={false} onCheckedChange={vi.fn()} />,
  )
  await expect.element(screen.getByText('Show edges')).toBeVisible()
})

test('calls onCheckedChange when clicked', async () => {
  const handler = vi.fn()
  const screen = await render(
    <SidebarCheckbox label="Show edges" checked={false} onCheckedChange={handler} />,
  )
  await screen.getByText('Show edges').click()
  expect(handler).toHaveBeenCalledWith(true)
})
