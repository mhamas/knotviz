import { describe, it, expect } from 'vitest'
import { computeHistogram, computeLogHistogram, computeDateHistogram } from '../lib/computeHistogram'

describe('computeHistogram', () => {
  it('returns empty array for empty input', () => {
    expect(computeHistogram([])).toEqual([])
  })

  it('produces correct bucket count via Sturges rule', () => {
    // n=5 → ceil(log2(5)+1) = ceil(3.32) = 4 buckets
    const buckets = computeHistogram([1, 2, 3, 4, 5])
    expect(buckets).toHaveLength(4)
  })

  it('every value falls into exactly one bucket', () => {
    const values = [1, 2, 3, 4, 5]
    const buckets = computeHistogram(values)
    const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(values.length)
  })

  it('buckets span [min, max]', () => {
    const buckets = computeHistogram([10, 20, 30, 40, 50])
    expect(buckets[0].from).toBe(10)
    expect(buckets[buckets.length - 1].to).toBe(50)
  })

  it('single value produces 3 buckets with value in first', () => {
    const buckets = computeHistogram([42])
    expect(buckets).toHaveLength(3)
    expect(buckets[0].count).toBe(1)
    expect(buckets[1].count).toBe(0)
    expect(buckets[2].count).toBe(0)
  })

  it('all identical values produce 3 zero-width buckets, all in first', () => {
    const buckets = computeHistogram([5, 5, 5, 5])
    expect(buckets).toHaveLength(3)
    expect(buckets[0].count).toBe(4)
    expect(buckets[1].count).toBe(0)
    expect(buckets[2].count).toBe(0)
    // Zero-width buckets all at same value
    expect(buckets[0].from).toBe(5)
    expect(buckets[0].to).toBe(5)
  })

  it('clamps bucket count to at least 3', () => {
    const buckets = computeHistogram([1, 2])
    expect(buckets.length).toBeGreaterThanOrEqual(3)
  })

  it('clamps bucket count to at most 20', () => {
    const values = Array.from({ length: 10_000_000 }, (_, i) => i)
    const buckets = computeHistogram(values)
    expect(buckets.length).toBeLessThanOrEqual(20)
  })

  it('handles large range of values', () => {
    const values = [0, 1000000]
    const buckets = computeHistogram(values)
    const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(2)
  })

  it('handles negative values', () => {
    const values = [-10, -5, 0, 5, 10]
    const buckets = computeHistogram(values)
    expect(buckets[0].from).toBe(-10)
    expect(buckets[buckets.length - 1].to).toBe(10)
    const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(5)
  })
})

describe('computeLogHistogram', () => {
  it('returns empty array for empty input', () => {
    expect(computeLogHistogram([])).toEqual([])
  })

  it('produces correct bucket count via Sturges rule', () => {
    const buckets = computeLogHistogram([1, 2, 3, 4, 5])
    expect(buckets).toHaveLength(4)
  })

  it('every value falls into exactly one bucket', () => {
    const values = [0, 1, 10, 100, 1000, 10000]
    const buckets = computeLogHistogram(values)
    const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(values.length)
  })

  it('handles zeros correctly (log10(0+1) = 0)', () => {
    const values = [0, 0, 0, 1, 10]
    const buckets = computeLogHistogram(values)
    expect(buckets[0].from).toBeCloseTo(0, 5)
    const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(5)
  })

  it('handles all-zero values (single log point)', () => {
    const buckets = computeLogHistogram([0, 0, 0, 0])
    expect(buckets).toHaveLength(3)
    expect(buckets[0].count).toBe(4)
    expect(buckets[0].from).toBeCloseTo(0, 5)
  })

  it('handles single zero value', () => {
    const buckets = computeLogHistogram([0])
    expect(buckets).toHaveLength(3)
    expect(buckets[0].count).toBe(1)
    expect(buckets[0].from).toBeCloseTo(0, 5)
  })

  it('bucket boundaries are in real (linear) space', () => {
    const values = [0, 1, 10, 100, 1000]
    const buckets = computeLogHistogram(values)
    // First bucket starts at 10^log10(0+1) - 1 = 10^0 - 1 = 0
    expect(buckets[0].from).toBeCloseTo(0, 5)
    // Last bucket ends at 10^log10(1000+1) - 1 ≈ 1000
    expect(buckets[buckets.length - 1].to).toBeCloseTo(1000, 0)
  })

  it('bucket boundaries are non-negative when all inputs are non-negative', () => {
    const values = [0, 1, 10, 100, 1000]
    const buckets = computeLogHistogram(values)
    for (const b of buckets) {
      expect(b.from).toBeGreaterThanOrEqual(-1e-10) // allow tiny FP error
      expect(b.to).toBeGreaterThanOrEqual(-1e-10)
    }
  })

  it('all identical values produce 3 buckets with all in first', () => {
    const buckets = computeLogHistogram([5, 5, 5, 5])
    expect(buckets).toHaveLength(3)
    expect(buckets[0].count).toBe(4)
  })

  it('handles very large values without NaN or Infinity', () => {
    const values = [0, 1, 1e6, 1e12, 1e15]
    const buckets = computeLogHistogram(values)
    const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(5)
    for (const b of buckets) {
      expect(Number.isFinite(b.from)).toBe(true)
      expect(Number.isFinite(b.to)).toBe(true)
    }
  })

  it('spreads skewed data more evenly than linear histogram', () => {
    // Power-law-like: most values near 0, a few very large
    const values = [0, 1, 1, 2, 2, 3, 5, 10, 100, 10000]
    const linearBuckets = computeHistogram(values)
    const logBuckets = computeLogHistogram(values)
    // In linear mode, almost all values in first bucket
    expect(linearBuckets[0].count).toBeGreaterThan(7)
    // In log mode, values are spread more evenly
    const maxLogCount = Math.max(...logBuckets.map((b) => b.count))
    expect(maxLogCount).toBeLessThan(linearBuckets[0].count)
  })

  it('bucket boundaries are monotonically increasing', () => {
    const values = [0, 1, 5, 10, 50, 100, 500, 1000]
    const buckets = computeLogHistogram(values)
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].from).toBeGreaterThanOrEqual(buckets[i - 1].from)
      expect(buckets[i].to).toBeGreaterThanOrEqual(buckets[i - 1].to)
    }
  })
})

describe('log scale conversion round-trip', () => {
  // Test the math that NumberFilter relies on: toLog(v) = log10(v+1), fromLog(s) = 10^s - 1
  const toLog = (v: number): number => Math.log10(v + 1)
  const fromLog = (s: number): number => Math.pow(10, s) - 1

  it('round-trips zero exactly', () => {
    expect(fromLog(toLog(0))).toBeCloseTo(0, 10)
  })

  it('round-trips small integers', () => {
    for (const v of [1, 2, 5, 10, 42]) {
      expect(fromLog(toLog(v))).toBeCloseTo(v, 8)
    }
  })

  it('round-trips large values with acceptable precision', () => {
    for (const v of [1000, 57855, 1e6, 1e12]) {
      const roundTripped = fromLog(toLog(v))
      const relativeError = Math.abs(roundTripped - v) / v
      expect(relativeError).toBeLessThan(1e-10)
    }
  })

  it('toLog(0) = 0', () => {
    expect(toLog(0)).toBe(0)
  })

  it('fromLog(0) = 0', () => {
    expect(fromLog(0)).toBe(0)
  })

  it('toLog is monotonically increasing', () => {
    const values = [0, 1, 2, 10, 100, 1000, 10000]
    for (let i = 1; i < values.length; i++) {
      expect(toLog(values[i])).toBeGreaterThan(toLog(values[i - 1]))
    }
  })

  it('fromLog is monotonically increasing', () => {
    const logValues = [0, 0.5, 1, 2, 3, 4, 5]
    for (let i = 1; i < logValues.length; i++) {
      expect(fromLog(logValues[i])).toBeGreaterThan(fromLog(logValues[i - 1]))
    }
  })
})

describe('computeDateHistogram', () => {
  it('returns empty array for empty input', () => {
    expect(computeDateHistogram([])).toEqual([])
  })

  it('produces buckets with YYYY-MM-DD boundaries', () => {
    const buckets = computeDateHistogram(['2020-01-01', '2022-01-01', '2024-01-01'])
    expect(buckets.length).toBeGreaterThanOrEqual(3)
    expect(buckets[0].from).toBe('2020-01-01')
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    expect(buckets[0].from).toMatch(datePattern)
    expect(buckets[0].to).toMatch(datePattern)
    const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(3)
  })
})
