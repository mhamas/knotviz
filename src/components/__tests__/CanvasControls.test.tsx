import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { CanvasControls } from '@/components/CanvasControls'

test('renders all control buttons', async () => {
  const screen = await render(
    <CanvasControls
      onZoomIn={vi.fn()}
      onZoomOut={vi.fn()}
      onFit={vi.fn()}
    />,
  )
  await expect.element(screen.getByRole('button', { name: 'Zoom in' })).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Zoom out' })).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Fit to view' })).toBeVisible()
})

test('clicking buttons calls correct callbacks', async () => {
  const zoomIn = vi.fn()
  const zoomOut = vi.fn()
  const fit = vi.fn()
  const screen = await render(
    <CanvasControls
      onZoomIn={zoomIn}
      onZoomOut={zoomOut}
      onFit={fit}
    />,
  )
  await screen.getByRole('button', { name: 'Zoom in' }).click()
  expect(zoomIn).toHaveBeenCalledOnce()
  await screen.getByRole('button', { name: 'Zoom out' }).click()
  expect(zoomOut).toHaveBeenCalledOnce()
  await screen.getByRole('button', { name: 'Fit to view' }).click()
  expect(fit).toHaveBeenCalledOnce()
})
