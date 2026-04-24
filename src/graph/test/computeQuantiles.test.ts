import { describe, it, expect } from 'vitest'
import { computeQuantiles, computeDateQuantiles } from '../lib/computeQuantiles'

describe('computeQuantiles', () => {
  it('returns an empty Float64Array for empty input', () => {
    const q = computeQuantiles([])
    expect(q.length).toBe(0)
  })

  it('returns 101 entries (p0..p100) for non-empty input', () => {
    const q = computeQuantiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(q.length).toBe(101)
  })

  it('p0 equals min, p100 equals max', () => {
    const q = computeQuantiles([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5])
    expect(q[0]).toBe(1)
    expect(q[100]).toBe(9)
  })

  it('is monotonically non-decreasing', () => {
    const q = computeQuantiles([5, 1, 3, 9, 7, 2, 8, 4, 6])
    for (let i = 1; i < q.length; i++) {
      expect(q[i]).toBeGreaterThanOrEqual(q[i - 1])
    }
  })

  it('handles all-identical values (every quantile equals the value)', () => {
    const q = computeQuantiles([7, 7, 7, 7])
    for (let i = 0; i < 101; i++) expect(q[i]).toBe(7)
  })

  it('handles a single value', () => {
    const q = computeQuantiles([42])
    expect(q.length).toBe(101)
    for (let i = 0; i < 101; i++) expect(q[i]).toBe(42)
  })

  it('interpolates between the two nearest sorted values', () => {
    // Sorted: [0, 100]. p50 should be the midpoint = 50.
    const q = computeQuantiles([0, 100])
    expect(q[50]).toBeCloseTo(50, 5)
  })

  it('median (p50) matches the classical definition', () => {
    // Sorted: [1, 2, 3, 4, 5]. p50 = 3.
    const q = computeQuantiles([5, 1, 4, 2, 3])
    expect(q[50]).toBeCloseTo(3, 5)
  })

  it('p25 and p75 on a uniform 0..100 distribution', () => {
    // 101 points from 0 to 100 step 1. p25 should be ~25, p75 ~75.
    const values = Array.from({ length: 101 }, (_, i) => i)
    const q = computeQuantiles(values)
    expect(q[25]).toBeCloseTo(25, 5)
    expect(q[75]).toBeCloseTo(75, 5)
  })
})

describe('computeDateQuantiles', () => {
  it('returns an empty array for empty input', () => {
    expect(computeDateQuantiles([])).toEqual([])
  })

  it('returns 101 ISO date strings', () => {
    const q = computeDateQuantiles(['2020-01-01', '2022-06-15', '2024-12-31'])
    expect(q.length).toBe(101)
    for (const d of q) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('p0 equals min date, p100 equals max date', () => {
    const q = computeDateQuantiles(['2022-06-15', '2020-01-01', '2024-12-31', '2021-03-22'])
    expect(q[0]).toBe('2020-01-01')
    expect(q[100]).toBe('2024-12-31')
  })

  it('is monotonically non-decreasing in date order', () => {
    const q = computeDateQuantiles([
      '2020-01-01', '2021-01-01', '2022-01-01', '2023-01-01', '2024-01-01',
    ])
    for (let i = 1; i < q.length; i++) {
      expect(q[i] >= q[i - 1]).toBe(true)
    }
  })

  it('p50 is approximately the median date', () => {
    // Five evenly-spaced years 2020–2024. Median = 2022.
    const q = computeDateQuantiles([
      '2020-01-01', '2021-01-01', '2022-01-01', '2023-01-01', '2024-01-01',
    ])
    expect(q[50]).toBe('2022-01-01')
  })
})
