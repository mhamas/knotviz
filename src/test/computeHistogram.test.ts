import { describe, it, expect } from 'vitest'
import { computeHistogram, computeDateHistogram } from '../lib/computeHistogram'

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
