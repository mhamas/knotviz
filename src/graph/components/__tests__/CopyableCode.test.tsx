import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { CopyableCode } from '@/components/sidebar'

test('renders label and code content', async () => {
  const screen = await render(
    <CopyableCode label="example.json" code='{"key": "value"}' />,
  )
  await expect.element(screen.getByText('example.json')).toBeVisible()
  await expect.element(screen.getByText('{"key": "value"}')).toBeVisible()
})

test('copy button shows Copied! feedback after click', async () => {
  vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  const screen = await render(
    <CopyableCode label="test" code="some code" />,
  )
  await screen.getByText('Copy').click()
  await expect.element(screen.getByText('Copied!')).toBeVisible()
})
