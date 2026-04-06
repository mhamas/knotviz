import type { NumericStats, DateStats, CategoricalStats, PropertyStatsResult, PropertyType } from '../types'
import { computeHistogram, computeDateHistogram } from './computeHistogram'

/**
 * Compute a percentile using linear interpolation on a sorted array.
 *
 * @param sorted - Ascending-sorted number array (must not be empty).
 * @param p - Percentile in [0, 100].
 * @returns Interpolated value at the given percentile.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0]
  const rank = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  if (lower === upper) return sorted[lower]
  const frac = rank - lower
  return sorted[lower] + frac * (sorted[upper] - sorted[lower])
}

/**
 * Compute descriptive statistics for a numeric array.
 * Returns null if the array is empty.
 *
 * @param values - Array of numbers.
 * @returns NumericStats or null if empty.
 *
 * @example
 * computeNumericStats([1, 2, 3, 4, 5])
 * // → { count: 5, min: 1, max: 5, mean: 3, median: 3, p10: 1.4, ... }
 */
export function computeNumericStats(values: number[]): NumericStats | null {
  if (values.length === 0) return null

  const sorted = Float64Array.from(values)
  sorted.sort()

  const n = sorted.length
  let sum = 0
  let min = sorted[0]
  let max = sorted[0]
  for (let i = 0; i < n; i++) {
    sum += sorted[i]
    if (sorted[i] < min) min = sorted[i]
    if (sorted[i] > max) max = sorted[i]
  }

  const sortedArr = Array.from(sorted)

  return {
    count: n,
    min,
    max,
    mean: sum / n,
    median: percentile(sortedArr, 50),
    p10: percentile(sortedArr, 10),
    p20: percentile(sortedArr, 20),
    p25: percentile(sortedArr, 25),
    p30: percentile(sortedArr, 30),
    p40: percentile(sortedArr, 40),
    p50: percentile(sortedArr, 50),
    p60: percentile(sortedArr, 60),
    p70: percentile(sortedArr, 70),
    p75: percentile(sortedArr, 75),
    p80: percentile(sortedArr, 80),
    p90: percentile(sortedArr, 90),
  }
}

/** Convert epoch-ms to YYYY-MM-DD string. */
function msToDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Compute descriptive statistics for a date array (ISO 8601 strings).
 * Internally converts to epoch-ms for math, then converts all results
 * back to YYYY-MM-DD strings. Returns null if the array is empty.
 *
 * @param values - Array of ISO 8601 date strings.
 * @returns DateStats (values are YYYY-MM-DD strings) or null if empty.
 *
 * @example
 * computeDateStats(['2020-01-01', '2021-06-15', '2023-12-31'])
 * // → { count: 3, min: '2020-01-01', max: '2023-12-31', ... }
 */
export function computeDateStats(values: string[]): DateStats | null {
  const ms = values.map((v) => new Date(v).getTime())
  const numeric = computeNumericStats(ms)
  if (!numeric) return null
  return {
    count: numeric.count,
    min: msToDate(numeric.min),
    max: msToDate(numeric.max),
    mean: msToDate(numeric.mean),
    median: msToDate(numeric.median),
    p10: msToDate(numeric.p10),
    p20: msToDate(numeric.p20),
    p25: msToDate(numeric.p25),
    p30: msToDate(numeric.p30),
    p40: msToDate(numeric.p40),
    p50: msToDate(numeric.p50),
    p60: msToDate(numeric.p60),
    p70: msToDate(numeric.p70),
    p75: msToDate(numeric.p75),
    p80: msToDate(numeric.p80),
    p90: msToDate(numeric.p90),
  }
}

/**
 * Compute frequency counts for a string or boolean array.
 * Returns a Map from each distinct value to its occurrence count.
 *
 * @param values - Array of strings or booleans.
 * @returns Map from value to count.
 *
 * @example
 * computeCategoricalStats(['a', 'b', 'a']) // → Map { 'a' => 2, 'b' => 1 }
 * computeCategoricalStats([true, false, true]) // → Map { true => 2, false => 1 }
 */
export function computeCategoricalStats(values: (string | boolean)[]): CategoricalStats {
  const counts: CategoricalStats = new Map()
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return counts
}

/**
 * Compute stats for a property column filtered by a visibility bitmask.
 * Extracts visible values, delegates to the appropriate stats function,
 * and returns a serializable result (safe for postMessage).
 *
 * @param visible - Uint8Array bitmask (1 = visible, 0 = hidden).
 * @param column - Property column values indexed by node index.
 * @param propType - The property type ('number', 'date', 'string', 'boolean').
 * @returns Serializable stats result, or null if no visible values.
 */
export function computeFilteredStats(
  visible: Uint8Array,
  column: (number | string | boolean | string[] | undefined)[],
  propType: PropertyType,
): PropertyStatsResult | null {
  if (propType === 'number') {
    const values: number[] = []
    for (let i = 0; i < visible.length; i++) {
      const v = column[i]
      if (visible[i] && typeof v === 'number') values.push(v)
    }
    const stats = computeNumericStats(values)
    if (!stats) return null
    const histogram = computeHistogram(values)
    return { type: 'numeric', stats, histogram }
  }

  if (propType === 'date') {
    const values: string[] = []
    for (let i = 0; i < visible.length; i++) {
      const v = column[i]
      if (visible[i] && typeof v === 'string') values.push(v)
    }
    const stats = computeDateStats(values)
    if (!stats) return null
    const histogram = computeDateHistogram(values)
    return { type: 'date', stats, histogram }
  }

  // string or boolean
  const values: (string | boolean)[] = []
  for (let i = 0; i < visible.length; i++) {
    const v = column[i]
    if (visible[i] && v !== undefined) values.push(v as string | boolean)
  }
  const counts = computeCategoricalStats(values)
  if (counts.size === 0) return null
  // Convert Map to tuple array for structured clone
  const tuples: [string | boolean, number][] = Array.from(counts.entries())
  tuples.sort((a, b) => b[1] - a[1]) // descending by count
  return { type: 'categorical', stats: tuples }
}
