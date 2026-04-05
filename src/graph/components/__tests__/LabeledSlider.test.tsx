import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { LabeledSlider } from '@/components/sidebar'

test('renders label and formatted value', async () => {
  const screen = await render(
    <LabeledSlider
      label="Gravity"
      value={5}
      formatValue={(v) => `${v}x`}
      min={1}
      max={10}
      step={1}
      defaultValue={[5]}
      onValueChange={vi.fn()}
    />,
  )
  await expect.element(screen.getByText('Gravity')).toBeVisible()
  await expect.element(screen.getByText('5x')).toBeVisible()
})

test('renders help popover when help prop provided', async () => {
  const screen = await render(
    <LabeledSlider
      label="Speed"
      value={3}
      help="Controls speed"
      min={1}
      max={10}
      step={1}
      defaultValue={[3]}
      onValueChange={vi.fn()}
    />,
  )
  await expect.element(screen.getByText('?')).toBeVisible()
})

test('renders slider track', async () => {
  const screen = await render(
    <LabeledSlider
      label="Size"
      value={5}
      min={1}
      max={10}
      step={1}
      defaultValue={[5]}
      onValueChange={vi.fn()}
    />,
  )
  expect(screen.container.querySelector('[data-slot="slider"]')).not.toBeNull()
})
