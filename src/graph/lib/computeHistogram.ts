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
 * Compute a histogram with equal-width bins in log₁₀ space.
 * Uses `log10(v + 1)` to handle zeros. Bucket boundaries are converted back
 * to linear (real) space. Only valid when all values are ≥ 0.
 *
 * @param values - Array of non-negative numbers.
 * @returns Array of histogram buckets with linear-space boundaries.
 *
 * @example
 * computeLogHistogram([0, 1, 10, 100, 1000])
 * // → buckets with boundaries in real space, equal-width in log space
 */
export function computeLogHistogram(values: number[]): HistogramBucket[] {
  if (values.length === 0) return []

  // Transform to log space
  const logValues = new Float64Array(values.length)
  for (let i = 0; i < values.length; i++) {
    logValues[i] = Math.log10(values[i] + 1)
  }

  let logMin = logValues[0]
  let logMax = logValues[0]
  for (let i = 1; i < logValues.length; i++) {
    if (logValues[i] < logMin) logMin = logValues[i]
    if (logValues[i] > logMax) logMax = logValues[i]
  }

  const bucketCount = Math.min(20, Math.max(3, Math.ceil(Math.log2(values.length) + 1)))

  const logRange = logMax - logMin
  const logWidth = logRange === 0 ? 0 : logRange / bucketCount

  const buckets: HistogramBucket[] = []
  for (let i = 0; i < bucketCount; i++) {
    buckets.push({
      from: Math.pow(10, logMin + i * logWidth) - 1,
      to: Math.pow(10, logMin + (i + 1) * logWidth) - 1,
      count: 0,
    })
  }

  for (let i = 0; i < logValues.length; i++) {
    let idx = logWidth === 0 ? 0 : Math.floor((logValues[i] - logMin) / logWidth)
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

/**
 * Log-scale histogram over a date array (ISO 8601 strings).
 *
 * Unlike numeric log scale — which gives the *low* end of the range more
 * resolution (appropriate for power-law distributions where small values
 * are dense) — date log scale is *inverted* to give the *high* end
 * (recent dates) more resolution. This matches the shape of typical
 * date-valued properties: user signups, commits, events, and activity
 * logs cluster toward "now" with a long tail going back. So the user
 * wants to filter finely among recent dates, not among ancient ones.
 *
 * Implementation: transform each date to "days since the most-recent
 * date" (non-negative), take log buckets, then flip back to absolute
 * dates. The tightest bucket is nearest `domainMax`; buckets widen
 * exponentially as you go back in time. Output is sorted chronologically
 * (first bucket = oldest, last bucket = most recent).
 *
 * Returns `[]` if any value is before 1970 (negative epoch-ms) — log is
 * undefined for negative values, and we match the absolute-value check
 * in `computeLogHistogram`.
 *
 * @param values - Array of ISO 8601 date strings. All must be ≥ 1970-01-01.
 * @returns Array of histogram buckets with YYYY-MM-DD from/to, equal-width
 *   in log₁₀(msMax − ms + 1) space, sorted chronologically.
 */
export function computeDateLogHistogram(values: string[]): DateHistogramBucket[] {
  if (values.length === 0) return []
  const ms: number[] = []
  for (const v of values) {
    const t = new Date(v).getTime()
    if (t < 0) return []
    ms.push(t)
  }
  let msMax = ms[0]
  for (const t of ms) if (t > msMax) msMax = t
  // Days-from-max: 0 at the most-recent date, growing as we go back.
  const msFromMax = ms.map((t) => msMax - t)
  const logBuckets = computeLogHistogram(msFromMax)
  // logBuckets are sorted ascending in msFromMax space (most-recent first
  // in time). Convert back to absolute dates and reverse, so the output
  // reads left-to-right as oldest → most recent.
  const abs = logBuckets.map((b) => ({
    from: new Date(msMax - b.to).toISOString().slice(0, 10),
    to: new Date(msMax - b.from).toISOString().slice(0, 10),
    count: b.count,
  }))
  abs.reverse()
  return abs
}
