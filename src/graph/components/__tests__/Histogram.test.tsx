import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { Histogram } from '../Histogram'
import type { HistogramBucket, DateHistogramBucket } from '../../types'

test('renders nothing when buckets array is empty', async () => {
  const screen = await render(<Histogram buckets={[]} />)
  expect(screen.container.querySelector('[data-testid="histogram"]')).toBeNull()
})

test('renders correct number of bars', async () => {
  const buckets: HistogramBucket[] = [
    { from: 0, to: 10, count: 3 },
    { from: 10, to: 20, count: 5 },
    { from: 20, to: 30, count: 2 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
  expect(bars.length).toBe(3)
})

test('tallest bar gets 100% height', async () => {
  const buckets: HistogramBucket[] = [
    { from: 0, to: 10, count: 2 },
    { from: 10, to: 20, count: 8 },
    { from: 20, to: 30, count: 4 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
  expect((bars[1] as HTMLElement).style.height).toBe('100%')
  expect((bars[0] as HTMLElement).style.height).toBe('25%')
  expect((bars[2] as HTMLElement).style.height).toBe('50%')
})

test('bars have title attributes for accessibility', async () => {
  const buckets: HistogramBucket[] = [
    { from: 10, to: 20, count: 5 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  const bar = screen.container.querySelector('[data-testid="histogram-bar"]') as HTMLElement
  expect(bar.title).toContain('10')
  expect(bar.title).toContain('20')
  expect(bar.title).toContain('5 nodes')
})

test('singular node label for count of 1', async () => {
  const buckets: HistogramBucket[] = [
    { from: 0, to: 5, count: 1 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  const bar = screen.container.querySelector('[data-testid="histogram-bar"]') as HTMLElement
  expect(bar.title).toContain('1 node')
  expect(bar.title).not.toContain('1 nodes')
})

test('no tooltip visible initially', async () => {
  const buckets: HistogramBucket[] = [
    { from: 0, to: 10, count: 3 },
    { from: 10, to: 20, count: 7 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  expect(screen.container.querySelector('[data-testid="histogram-tooltip"]')).toBeNull()
})

test('renders date histogram buckets', async () => {
  const buckets: DateHistogramBucket[] = [
    { from: '2020-01-01', to: '2021-01-01', count: 4 },
    { from: '2021-01-01', to: '2022-01-01', count: 6 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
  expect(bars.length).toBe(2)
  expect((bars[0] as HTMLElement).title).toContain('2020-01-01')
  expect((bars[1] as HTMLElement).title).toContain('2022-01-01')
})

test('zero-count bars have zero height', async () => {
  const buckets: HistogramBucket[] = [
    { from: 0, to: 10, count: 5 },
    { from: 10, to: 20, count: 0 },
    { from: 20, to: 30, count: 3 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
  expect((bars[1] as HTMLElement).style.height).toBe('0%')
})

test('all equal-count bars render at 100% height', async () => {
  const buckets: HistogramBucket[] = [
    { from: 0, to: 10, count: 5 },
    { from: 10, to: 20, count: 5 },
    { from: 20, to: 30, count: 5 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
  for (const bar of bars) {
    expect((bar as HTMLElement).style.height).toBe('100%')
  }
})

test('single bucket renders at full height', async () => {
  const buckets: HistogramBucket[] = [
    { from: 5, to: 15, count: 10 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
  expect(bars.length).toBe(1)
  expect((bars[0] as HTMLElement).style.height).toBe('100%')
})

test('all-zero buckets render with 0% height', async () => {
  const buckets: HistogramBucket[] = [
    { from: 0, to: 10, count: 0 },
    { from: 10, to: 20, count: 0 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
  for (const bar of bars) {
    expect((bar as HTMLElement).style.height).toBe('0%')
  }
})

test('tooltip formats large numbers with locale separators', async () => {
  const buckets: HistogramBucket[] = [
    { from: 1000000, to: 2000000, count: 1500000 },
  ]
  const screen = await render(<Histogram buckets={buckets} />)
  const bar = screen.container.querySelector('[data-testid="histogram-bar"]') as HTMLElement
  expect(bar.title).toContain('1,000,000')
  expect(bar.title).toContain('1,500,000')
})
