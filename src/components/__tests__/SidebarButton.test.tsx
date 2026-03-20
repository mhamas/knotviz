import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { SidebarButton } from '@/components/sidebar'

test('renders button text and calls onClick', async () => {
  const handler = vi.fn()
  const screen = await render(<SidebarButton onClick={handler}>Run</SidebarButton>)
  await expect.element(screen.getByText('Run')).toBeVisible()
  await screen.getByText('Run').click()
  expect(handler).toHaveBeenCalledOnce()
})

test('applies green color variant classes', async () => {
  const screen = await render(
    <SidebarButton onClick={vi.fn()} color="green">Start</SidebarButton>,
  )
  const button = screen.getByRole('button')
  await expect.element(button).toHaveClass('bg-emerald-50')
})

test('applies red color variant classes', async () => {
  const screen = await render(
    <SidebarButton onClick={vi.fn()} color="red">Stop</SidebarButton>,
  )
  const button = screen.getByRole('button')
  await expect.element(button).toHaveClass('bg-red-50')
})

test('disabled button is rendered as disabled', async () => {
  const handler = vi.fn()
  const screen = await render(
    <SidebarButton onClick={handler} disabled>Reset</SidebarButton>,
  )
  const button = screen.getByRole('button')
  await expect.element(button).toBeDisabled()
})
