import type { HistogramBucket, DateHistogramBucket } from '../types'

/**
 * Compute a histogram over a numeric array using Sturges' rule for bucket count.
 * Returns an empty array if the input is empty.
 *
 * Bucket boundaries: `from` is inclusive, `to` is exclusive — except the last
 * bucket where `to` is inclusive. When all values are identical, produces 3
 * zero-width buckets with all values in the first.
 *
 * @param values - Array of numbers.
 * @returns Array of histogram buckets.
 *
 * @example
 * computeHistogram([1, 2, 3, 4, 5])
 * // → [{ from: 1, to: 2, count: 1 }, { from: 2, to: 3, count: 1 }, ...]
 */
export function computeHistogram(values: number[]): HistogramBucket[] {
  if (values.length === 0) return []

  let min = values[0]
  let max = values[0]
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i]
    if (values[i] > max) max = values[i]
  }

  // Sturges' rule, clamped to [3, 20]
  const bucketCount = Math.min(20, Math.max(3, Math.ceil(Math.log2(values.length) + 1)))

  const range = max - min
  const width = range === 0 ? 0 : range / bucketCount

  const buckets: HistogramBucket[] = []
  for (let i = 0; i < bucketCount; i++) {
    buckets.push({
      from: min + i * width,
      to: min + (i + 1) * width,
      count: 0,
    })
  }

  for (const v of values) {
    let idx = width === 0 ? 0 : Math.floor((v - min) / width)
    // Clamp to last bucket (handles v === max)
    if (idx >= bucketCount) idx = bucketCount - 1
    buckets[idx].count++
  }

  return buckets
}

/**
 * Compute a histogram over a date array (ISO 8601 strings).
 * Internally converts to epoch-ms for bucketing, then converts boundaries
 * back to YYYY-MM-DD strings.
 *
 * @param values - Array of ISO 8601 date strings.
 * @returns Array of histogram buckets with YYYY-MM-DD from/to.
 *
 * @example
 * computeDateHistogram(['2020-01-01', '2021-06-15', '2023-12-31'])
 * // → [{ from: '2020-01-01', to: '2021-04-23', count: 1 }, ...]
 */
export function computeDateHistogram(values: string[]): DateHistogramBucket[] {
  const msBuckets = computeHistogram(values.map((v) => new Date(v).getTime()))
  return msBuckets.map((b) => ({
    from: new Date(b.from).toISOString().slice(0, 10),
    to: new Date(b.to).toISOString().slice(0, 10),
    count: b.count,
  }))
}
