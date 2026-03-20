import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { HelpPopover } from '@/components/sidebar'

test('renders trigger button with ?', async () => {
  const screen = await render(<HelpPopover>Help text</HelpPopover>)
  await expect.element(screen.getByText('?')).toBeVisible()
})

test('shows popover content on click', async () => {
  const screen = await render(<HelpPopover>Detailed help text</HelpPopover>)
  await screen.getByText('?').click()
  await expect.element(screen.getByText('Detailed help text')).toBeVisible()
})
