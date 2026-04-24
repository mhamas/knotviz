/**
 * Compute 101 evenly-spaced quantiles (p0, p1, ..., p100) from a numeric
 * array. Uses linear interpolation between the two nearest sorted values,
 * matching the numpy-default "linear" method (type 7 in Hyndman-Fan taxonomy).
 *
 * Returns an empty Float64Array when the input is empty.
 *
 * Used by the percentile-mode filter slider: indexing `quantiles[p]`
 * gives the actual data value at percentile `p`, so the slider can
 * operate in [0, 100] space and convert to real values in O(1).
 *
 * @param values - Array of numbers.
 * @returns Float64Array of length 101 (or 0 for empty input).
 *
 * @example
 * computeQuantiles([1, 2, 3, 4, 5])
 * // → Float64Array of 101 entries: q[0]=1, q[50]=3, q[100]=5
 */
export function computeQuantiles(values: number[]): Float64Array {
  if (values.length === 0) return new Float64Array(0)
  const sorted = values.slice().sort((a, b) => a - b)
  const n = sorted.length
  const out = new Float64Array(101)
  for (let i = 0; i <= 100; i++) {
    if (n === 1) {
      out[i] = sorted[0]
      continue
    }
    const pos = (i / 100) * (n - 1)
    const lo = Math.floor(pos)
    const hi = Math.ceil(pos)
    if (lo === hi) {
      out[i] = sorted[lo]
    } else {
      const t = pos - lo
      out[i] = sorted[lo] + (sorted[hi] - sorted[lo]) * t
    }
  }
  return out
}

/**
 * Compute 101 date quantiles from an ISO-8601 date array. Operates on
 * epoch-ms internally; boundaries are rounded to whole days.
 *
 * @param values - Array of ISO 8601 date strings.
 * @returns Array of 101 YYYY-MM-DD strings (or empty array for empty input).
 */
export function computeDateQuantiles(values: string[]): string[] {
  if (values.length === 0) return []
  const ms = values.map((v) => new Date(v).getTime())
  const msQuantiles = computeQuantiles(ms)
  const out: string[] = new Array(101)
  for (let i = 0; i <= 100; i++) {
    out[i] = new Date(Math.round(msQuantiles[i])).toISOString().slice(0, 10)
  }
  return out
}
