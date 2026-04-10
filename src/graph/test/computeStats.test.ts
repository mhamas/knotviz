import { describe, it, expect } from 'vitest'
import { computeNumericStats, computeDateStats, computeCategoricalStats, computeFilteredStats } from '../lib/computeStats'

describe('computeNumericStats', () => {
  it('returns null for empty array', () => {
    expect(computeNumericStats([])).toBeNull()
  })

  it('computes stats for single element', () => {
    const result = computeNumericStats([42])!
    expect(result.count).toBe(1)
    expect(result.min).toBe(42)
    expect(result.max).toBe(42)
    expect(result.mean).toBe(42)
    expect(result.median).toBe(42)
    expect(result.p25).toBe(42)
    expect(result.p75).toBe(42)
  })

  it('computes stats for [1,2,3,4,5]', () => {
    const result = computeNumericStats([1, 2, 3, 4, 5])!
    expect(result.count).toBe(5)
    expect(result.sum).toBe(15)
    expect(result.min).toBe(1)
    expect(result.max).toBe(5)
    expect(result.mean).toBe(3)
    expect(result.median).toBe(3)
    expect(result.p25).toBe(2)
    expect(result.p75).toBe(4)
  })

  it('computes correct sum for single element', () => {
    const result = computeNumericStats([42])!
    expect(result.sum).toBe(42)
  })

  it('computes correct sum with negative values', () => {
    const result = computeNumericStats([-10, -5, 0, 5, 10])!
    expect(result.sum).toBe(0)
  })

  it('computes correct sum with decimals', () => {
    const result = computeNumericStats([0.1, 0.2, 0.3])!
    expect(result.sum).toBeCloseTo(0.6, 10)
  })

  it('computes correct median for even-length array', () => {
    const result = computeNumericStats([1, 2, 3, 4])!
    expect(result.median).toBe(2.5)
  })

  it('returns all percentile fields', () => {
    const result = computeNumericStats([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])!
    expect(result.p10).toBeCloseTo(19, 0)
    expect(result.p20).toBeCloseTo(28, 0)
    expect(result.p25).toBeCloseTo(32.5, 0)
    expect(result.p30).toBeCloseTo(37, 0)
    expect(result.p40).toBeCloseTo(46, 0)
    expect(result.p50).toBeCloseTo(55, 0)
    expect(result.p60).toBeCloseTo(64, 0)
    expect(result.p70).toBeCloseTo(73, 0)
    expect(result.p75).toBeCloseTo(77.5, 0)
    expect(result.p80).toBeCloseTo(82, 0)
    expect(result.p90).toBeCloseTo(91, 0)
  })

  it('p50 equals median', () => {
    const result = computeNumericStats([3, 7, 15, 22, 99])!
    expect(result.p50).toBe(result.median)
  })

  it('handles identical values', () => {
    const result = computeNumericStats([5, 5, 5, 5])!
    expect(result.count).toBe(4)
    expect(result.min).toBe(5)
    expect(result.max).toBe(5)
    expect(result.mean).toBe(5)
    expect(result.median).toBe(5)
    expect(result.p10).toBe(5)
    expect(result.p90).toBe(5)
  })

  it('handles unsorted input', () => {
    const result = computeNumericStats([5, 1, 3, 2, 4])!
    expect(result.min).toBe(1)
    expect(result.max).toBe(5)
    expect(result.median).toBe(3)
  })

  it('handles negative values', () => {
    const result = computeNumericStats([-10, -5, 0, 5, 10])!
    expect(result.min).toBe(-10)
    expect(result.max).toBe(10)
    expect(result.mean).toBe(0)
    expect(result.median).toBe(0)
  })
})

describe('computeDateStats', () => {
  it('returns null for empty array', () => {
    expect(computeDateStats([])).toBeNull()
  })

  it('returns YYYY-MM-DD strings', () => {
    const result = computeDateStats(['2020-01-01', '2022-01-01', '2024-01-01'])!
    expect(result.count).toBe(3)
    expect(result.min).toBe('2020-01-01')
    expect(result.max).toBe('2024-01-01')
    // Mean of epoch-ms may not land on exact date due to leap years
    expect(result.mean).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.median).toBe('2022-01-01')
  })

  it('median falls between min and max', () => {
    const result = computeDateStats(['2020-01-01', '2021-06-15', '2023-12-31'])!
    expect(result.median >= result.min).toBe(true)
    expect(result.median <= result.max).toBe(true)
  })

  it('all percentiles are YYYY-MM-DD strings', () => {
    const result = computeDateStats(['2020-01-01', '2021-01-01', '2022-01-01', '2023-01-01', '2024-01-01'])!
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    expect(result.p10).toMatch(datePattern)
    expect(result.p25).toMatch(datePattern)
    expect(result.p50).toMatch(datePattern)
    expect(result.p75).toMatch(datePattern)
    expect(result.p90).toMatch(datePattern)
  })

  it('single date has all fields equal', () => {
    const result = computeDateStats(['2023-06-15'])!
    expect(result.count).toBe(1)
    expect(result.min).toBe('2023-06-15')
    expect(result.max).toBe('2023-06-15')
    expect(result.median).toBe('2023-06-15')
  })
})

describe('computeCategoricalStats', () => {
  it('returns empty map for empty array', () => {
    const result = computeCategoricalStats([])
    expect(result.size).toBe(0)
  })

  it('counts string values', () => {
    const result = computeCategoricalStats(['a', 'b', 'a', 'c', 'a', 'b'])
    expect(result.get('a')).toBe(3)
    expect(result.get('b')).toBe(2)
    expect(result.get('c')).toBe(1)
    expect(result.size).toBe(3)
  })

  it('counts boolean values', () => {
    const result = computeCategoricalStats([true, false, true, true])
    expect(result.get(true)).toBe(3)
    expect(result.get(false)).toBe(1)
    expect(result.size).toBe(2)
  })

  it('handles single value', () => {
    const result = computeCategoricalStats(['only'])
    expect(result.get('only')).toBe(1)
    expect(result.size).toBe(1)
  })

  it('handles all identical values', () => {
    const result = computeCategoricalStats([true, true, true])
    expect(result.get(true)).toBe(3)
    expect(result.size).toBe(1)
  })
})

describe('computeFilteredStats', () => {
  it('returns null when no visible values', () => {
    const visible = new Uint8Array([0, 0, 0])
    const column = [10, 20, 30]
    expect(computeFilteredStats(visible, column, 'number')).toBeNull()
  })

  it('computes numeric stats for visible nodes only', () => {
    const visible = new Uint8Array([1, 0, 1, 0, 1])
    const column = [10, 20, 30, 40, 50]
    const result = computeFilteredStats(visible, column, 'number')!
    expect(result.type).toBe('numeric')
    if (result.type === 'numeric') {
      expect(result.stats.count).toBe(3)
      expect(result.stats.min).toBe(10)
      expect(result.stats.max).toBe(50)
      expect(result.stats.mean).toBe(30)
      expect(result.histogram).toBeDefined()
      expect(result.histogram.length).toBeGreaterThan(0)
      expect(result.histogram[0]).toHaveProperty('from')
      expect(result.histogram[0]).toHaveProperty('to')
      expect(result.histogram[0]).toHaveProperty('count')
    }
  })

  it('computes date stats as YYYY-MM-DD strings', () => {
    const visible = new Uint8Array([1, 1, 1])
    const column = ['2020-01-01', '2022-01-01', '2024-01-01']
    const result = computeFilteredStats(visible, column, 'date')!
    expect(result.type).toBe('date')
    if (result.type === 'date') {
      expect(result.stats.count).toBe(3)
      expect(result.stats.min).toBe('2020-01-01')
      expect(result.stats.max).toBe('2024-01-01')
      expect(result.histogram).toBeDefined()
      expect(result.histogram.length).toBeGreaterThan(0)
      expect(typeof result.histogram[0].from).toBe('string')
      expect(typeof result.histogram[0].to).toBe('string')
    }
  })

  it('computes categorical stats sorted by count descending', () => {
    const visible = new Uint8Array([1, 1, 1, 1, 1])
    const column = ['a', 'b', 'a', 'a', 'b']
    const result = computeFilteredStats(visible, column, 'string')!
    expect(result.type).toBe('categorical')
    if (result.type === 'categorical') {
      expect(result.stats[0]).toEqual(['a', 3])
      expect(result.stats[1]).toEqual(['b', 2])
    }
  })

  it('computes boolean categorical stats', () => {
    const visible = new Uint8Array([1, 0, 1, 1])
    const column = [true, false, true, false]
    const result = computeFilteredStats(visible, column, 'boolean')!
    expect(result.type).toBe('categorical')
    if (result.type === 'categorical') {
      expect(result.stats).toEqual([[true, 2], [false, 1]])
    }
  })

  it('skips undefined values in column', () => {
    const visible = new Uint8Array([1, 1, 1])
    const column: (number | undefined)[] = [10, undefined, 30]
    const result = computeFilteredStats(visible, column, 'number')!
    if (result.type === 'numeric') {
      expect(result.stats.count).toBe(2)
    }
  })

  it('flattens string[] arrays into individual strings', () => {
    const visible = new Uint8Array([1, 1, 1])
    const column: (string[] | undefined)[] = [['a', 'b'], ['b', 'c'], ['a']]
    const result = computeFilteredStats(visible, column, 'string[]')!
    expect(result.type).toBe('categorical')
    if (result.type === 'categorical') {
      // a appears 2x, b appears 2x, c appears 1x
      const map = new Map(result.stats)
      expect(map.get('a')).toBe(2)
      expect(map.get('b')).toBe(2)
      expect(map.get('c')).toBe(1)
      expect(result.stats.length).toBe(3) // 3 distinct values
    }
  })

  it('flattens string[] with empty arrays and undefined entries', () => {
    const visible = new Uint8Array([1, 1, 1, 1])
    const column: (string[] | undefined)[] = [[], undefined, ['x', 'y'], []]
    const result = computeFilteredStats(visible, column, 'string[]')!
    expect(result.type).toBe('categorical')
    if (result.type === 'categorical') {
      const map = new Map(result.stats)
      expect(map.get('x')).toBe(1)
      expect(map.get('y')).toBe(1)
      expect(result.stats.length).toBe(2)
    }
  })

  it('returns null for string[] when all entries are empty or undefined', () => {
    const visible = new Uint8Array([1, 1, 1])
    const column: (string[] | undefined)[] = [[], undefined, []]
    expect(computeFilteredStats(visible, column, 'string[]')).toBeNull()
  })

  it('produces histogram for a single visible numeric value', () => {
    const visible = new Uint8Array([1, 0, 0])
    const column = [42, 10, 20]
    const result = computeFilteredStats(visible, column, 'number')!
    expect(result.type).toBe('numeric')
    if (result.type === 'numeric') {
      expect(result.stats.count).toBe(1)
      expect(result.histogram.length).toBeGreaterThanOrEqual(3)
      const totalCount = result.histogram.reduce((s, b) => s + b.count, 0)
      expect(totalCount).toBe(1)
    }
  })

  it('produces date histogram for identical dates', () => {
    const visible = new Uint8Array([1, 1, 1])
    const column = ['2023-06-15', '2023-06-15', '2023-06-15']
    const result = computeFilteredStats(visible, column, 'date')!
    expect(result.type).toBe('date')
    if (result.type === 'date') {
      expect(result.histogram.length).toBeGreaterThanOrEqual(3)
      expect(result.histogram[0].count).toBe(3)
      expect(result.histogram[0].from).toBe('2023-06-15')
    }
  })
})
