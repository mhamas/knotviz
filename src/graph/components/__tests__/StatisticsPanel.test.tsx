import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { StatisticsPanel } from '../StatisticsPanel'
import type { PropertyStatsResult, NumericStats } from '../../types'

const numericStats: NumericStats = {
  count: 5, sum: 25, min: 1, max: 10, mean: 5, median: 5,
  p10: 2, p20: 3, p25: 3, p30: 4, p40: 4,
  p50: 5, p60: 6, p70: 7, p75: 8, p80: 8, p90: 9,
}

test('returns null when propertyKey is null', async () => {
  const screen = await render(<StatisticsPanel stats={null} propertyKey={null} />)
  expect(screen.container.querySelector('.space-y-0\\.5')).toBeNull()
})

test('returns null when stats is null', async () => {
  const screen = await render(<StatisticsPanel stats={null} propertyKey="age" />)
  expect(screen.container.querySelector('.space-y-0\\.5')).toBeNull()
})

test('renders numeric stats with histogram', async () => {
  const stats: PropertyStatsResult = {
    type: 'numeric',
    stats: numericStats,
    histogram: [
      { from: 1, to: 4, count: 2 },
      { from: 4, to: 7, count: 2 },
      { from: 7, to: 10, count: 1 },
    ],
  }
  const screen = await render(<StatisticsPanel stats={stats} propertyKey="age" />)
  await expect.element(screen.getByText('age')).toBeVisible()
  await expect.element(screen.getByTestId('stat-total nodes')).toBeVisible()
  await expect.element(screen.getByTestId('stat-mean value')).toBeVisible()
  // Histogram should render with 3 bars
  const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
  expect(bars.length).toBe(3)
})

test('numeric stats render coloured markers for mean + p25/p50/p75 and matching row dots', async () => {
  const stats: PropertyStatsResult = {
    type: 'numeric',
    stats: numericStats,
    histogram: [
      { from: 1, to: 4, count: 2 },
      { from: 4, to: 7, count: 2 },
      { from: 7, to: 10, count: 1 },
    ],
  }
  const screen = await render(<StatisticsPanel stats={stats} propertyKey="age" />)
  // All four histogram markers are rendered.
  expect(screen.container.querySelector('[data-testid="stat-marker-mean"]')).not.toBeNull()
  expect(screen.container.querySelector('[data-testid="stat-marker-p25"]')).not.toBeNull()
  expect(screen.container.querySelector('[data-testid="stat-marker-p50"]')).not.toBeNull()
  expect(screen.container.querySelector('[data-testid="stat-marker-p75"]')).not.toBeNull()
  // Each marked StatRow has a dot.
  const dots = screen.container.querySelectorAll('[data-testid="stat-row-marker"]')
  expect(dots.length).toBe(4)
})

test('no stat markers when histogram is empty', async () => {
  const stats: PropertyStatsResult = {
    type: 'numeric',
    stats: numericStats,
    histogram: [],
  }
  const screen = await render(<StatisticsPanel stats={stats} propertyKey="age" />)
  expect(screen.container.querySelector('[data-testid="stat-marker-mean"]')).toBeNull()
  expect(screen.container.querySelector('[data-testid="stat-marker-p25"]')).toBeNull()
})

test('renders total value (sum) row for numeric stats', async () => {
  const stats: PropertyStatsResult = {
    type: 'numeric',
    stats: numericStats,
    histogram: [{ from: 1, to: 10, count: 5 }],
  }
  const screen = await render(<StatisticsPanel stats={stats} propertyKey="age" />)
  await expect.element(screen.getByTestId('stat-total value')).toBeVisible()
  await expect.element(screen.getByTestId('stat-total value')).toHaveTextContent('25')
})

test('numeric stats with empty histogram renders no histogram', async () => {
  const stats: PropertyStatsResult = {
    type: 'numeric',
    stats: numericStats,
    histogram: [],
  }
  const screen = await render(<StatisticsPanel stats={stats} propertyKey="test" />)
  await expect.element(screen.getByTestId('stat-total nodes')).toBeVisible()
  expect(screen.container.querySelector('[data-testid="histogram"]')).toBeNull()
})

test('categorical stats show Distinct count', async () => {
  const stats: PropertyStatsResult = {
    type: 'categorical',
    stats: [['active', 3], ['inactive', 1], ['pending', 2]],
  }
  const screen = await render(<StatisticsPanel stats={stats} propertyKey="status" />)
  await expect.element(screen.getByTestId('stat-distinct')).toBeVisible()
  await expect.element(screen.getByTestId('stat-distinct')).toHaveTextContent('3')
})

test('categorical stats with single value shows Distinct 1', async () => {
  const stats: PropertyStatsResult = {
    type: 'categorical',
    stats: [['only', 10]],
  }
  const screen = await render(<StatisticsPanel stats={stats} propertyKey="type" />)
  await expect.element(screen.getByTestId('stat-distinct')).toHaveTextContent('1')
})

test('date stats render histogram', async () => {
  const stats: PropertyStatsResult = {
    type: 'date',
    stats: {
      count: 3, min: '2020-01-01', max: '2024-01-01', mean: '2022-01-01', median: '2022-01-01',
      p10: '2020-07-01', p20: '2021-01-01', p25: '2021-04-01', p30: '2021-07-01',
      p40: '2021-10-01', p50: '2022-01-01', p60: '2022-04-01', p70: '2022-07-01',
      p75: '2023-01-01', p80: '2023-04-01', p90: '2023-07-01',
    },
    histogram: [
      { from: '2020-01-01', to: '2022-01-01', count: 1 },
      { from: '2022-01-01', to: '2024-01-01', count: 2 },
    ],
  }
  const screen = await render(<StatisticsPanel stats={stats} propertyKey="joined" />)
  const bars = screen.container.querySelectorAll('[data-testid="histogram-bar"]')
  expect(bars.length).toBe(2)
})
