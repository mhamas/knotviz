import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { CollapsibleSection } from '@/components/sidebar'

test('children are hidden by default', async () => {
  const screen = await render(
    <CollapsibleSection label="Settings">
      <p>Hidden content</p>
    </CollapsibleSection>,
  )
  await expect.element(screen.getByText('Settings')).toBeVisible()
  // details is closed by default, so the content div exists but is not visible
  const details = screen.container.querySelector('details')
  expect(details?.open).toBe(false)
})

test('clicking summary reveals children', async () => {
  const screen = await render(
    <CollapsibleSection label="Settings">
      <p>Revealed content</p>
    </CollapsibleSection>,
  )
  await screen.getByText('Settings').click()
  await expect.element(screen.getByText('Revealed content')).toBeVisible()
})
