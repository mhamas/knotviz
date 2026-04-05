import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { StatRow } from '@/components/sidebar'

test('renders label and value', async () => {
  const screen = await render(<StatRow label="Nodes" value={42} />)
  await expect.element(screen.getByText('Nodes')).toBeVisible()
  await expect.element(screen.getByText('42')).toBeVisible()
})

test('sets data-testid based on label', async () => {
  const screen = await render(<StatRow label="Edges" value="128" />)
  expect(screen.getByTestId('stat-edges')).toBeDefined()
})
