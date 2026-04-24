import type { HistogramBucket, DateHistogramBucket } from '../types'

/**
 * Convert a numeric value to its x-position (0–100) on a histogram
 * rendered by the `Histogram` component. Bars are drawn with equal
 * visual width regardless of the underlying scale (linear or log), so
 * the position is `(bucketIndex + fractionWithinBucket) / bucketCount`.
 * Linear interpolation within a bucket is visually faithful because the
 * DOM renders each bar's x-axis linearly.
 *
 * Clamps out-of-range values to the endpoints.
 *
 * @param v       - The value to locate on the histogram.
 * @param buckets - Histogram buckets (must have non-empty list).
 * @returns Position in [0, 100].
 */
export function valueToHistogramPercent(v: number, buckets: HistogramBucket[]): number {
  if (buckets.length === 0) return 0
  if (v <= buckets[0].from) return 0
  if (v >= buckets[buckets.length - 1].to) return 100
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i]
    if (v >= b.from && v < b.to) {
      const span = b.to - b.from
      const inBucket = span === 0 ? 0 : (v - b.from) / span
      return ((i + inBucket) / buckets.length) * 100
    }
  }
  return 100
}

/**
 * Convert an ISO date to its x-position (0–100) on a date histogram.
 * Mirrors `valueToHistogramPercent` but works in epoch-ms space.
 */
export function dateToHistogramPercent(iso: string, buckets: DateHistogramBucket[]): number {
  if (buckets.length === 0) return 0
  const target = new Date(iso).getTime()
  const firstFrom = new Date(buckets[0].from).getTime()
  const lastTo = new Date(buckets[buckets.length - 1].to).getTime()
  if (target <= firstFrom) return 0
  if (target >= lastTo) return 100
  for (let i = 0; i < buckets.length; i++) {
    const bFrom = new Date(buckets[i].from).getTime()
    const bTo = new Date(buckets[i].to).getTime()
    if (target >= bFrom && target < bTo) {
      const span = bTo - bFrom
      const inBucket = span === 0 ? 0 : (target - bFrom) / span
      return ((i + inBucket) / buckets.length) * 100
    }
  }
  return 100
}
