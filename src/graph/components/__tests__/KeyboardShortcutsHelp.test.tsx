import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'

test('renders trigger button with keyboard shortcuts label', async () => {
  const screen = await render(<KeyboardShortcutsHelp />)
  await expect
    .element(screen.getByRole('button', { name: 'Keyboard shortcuts' }))
    .toBeVisible()
})

test('clicking opens popover with shortcut entries', async () => {
  const screen = await render(<KeyboardShortcutsHelp />)
  await screen.getByRole('button', { name: 'Keyboard shortcuts' }).click()
  await expect.element(screen.getByText('Space')).toBeVisible()
  await expect.element(screen.getByText('Controls')).toBeVisible()
  await expect.element(screen.getByText('Zoom in / out')).toBeVisible()
})
