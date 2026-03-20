import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { FilenameLabel } from '@/components/FilenameLabel'

test('renders filename text', async () => {
  const screen = await render(<FilenameLabel filename="my-graph.json" />)
  await expect.element(screen.getByText('my-graph.json')).toBeVisible()
})
