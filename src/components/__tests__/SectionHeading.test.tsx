import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { SectionHeading } from '@/components/sidebar'

test('renders heading text', async () => {
  const screen = await render(<SectionHeading>Simulation</SectionHeading>)
  await expect.element(screen.getByText('Simulation')).toBeVisible()
})

test('renders help popover trigger when help prop provided', async () => {
  const screen = await render(
    <SectionHeading help="Some help text">Display</SectionHeading>,
  )
  await expect.element(screen.getByText('?')).toBeVisible()
})

test('does not render help trigger when help prop omitted', async () => {
  const screen = await render(<SectionHeading>Display</SectionHeading>)
  expect(screen.container.querySelector('[class*="rounded-full"]')).toBeNull()
})
