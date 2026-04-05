import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { DragOverlay } from '@/components/DragOverlay'

test('visible overlay has opacity-100 class', async () => {
  const screen = await render(<DragOverlay isVisible={true} />)
  const el = screen.getByTestId('drag-overlay')
  await expect.element(el).toHaveClass('opacity-100')
})

test('hidden overlay has opacity-0 class', async () => {
  const screen = await render(<DragOverlay isVisible={false} />)
  const el = screen.getByTestId('drag-overlay')
  await expect.element(el).toHaveClass('opacity-0')
})

test('always renders drop text', async () => {
  const screen = await render(<DragOverlay isVisible={false} />)
  await expect.element(screen.getByText('Drop to load new graph.')).toBeInTheDocument()
})
