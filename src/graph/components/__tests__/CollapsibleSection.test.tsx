import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { CollapsibleSection } from '@/components/sidebar'

test('children are visible by default (defaultOpen=true)', async () => {
  const screen = await render(
    <CollapsibleSection label="Settings">
      <p>Visible content</p>
    </CollapsibleSection>,
  )
  await expect.element(screen.getByText('Settings')).toBeVisible()
  const details = screen.container.querySelector('details')
  expect(details?.open).toBe(true)
  await expect.element(screen.getByText('Visible content')).toBeVisible()
})

test('children are hidden when defaultOpen=false', async () => {
  const screen = await render(
    <CollapsibleSection label="Settings" defaultOpen={false}>
      <p>Hidden content</p>
    </CollapsibleSection>,
  )
  await expect.element(screen.getByText('Settings')).toBeVisible()
  const details = screen.container.querySelector('details')
  expect(details?.open).toBe(false)
})

test('clicking summary toggles children', async () => {
  const screen = await render(
    <CollapsibleSection label="Settings">
      <p>Toggle content</p>
    </CollapsibleSection>,
  )
  await expect.element(screen.getByText('Toggle content')).toBeVisible()
  // Close it
  await screen.getByText('Settings').click()
  const details = screen.container.querySelector('details')
  expect(details?.open).toBe(false)
})

test('renders help popover when help prop is provided', async () => {
  const screen = await render(
    <CollapsibleSection label="Settings" help="Some help text">
      <p>Content</p>
    </CollapsibleSection>,
  )
  await expect.element(screen.getByText('?')).toBeVisible()
})
