/**
 * Pure utility functions shared between the appearance worker and tests.
 * Extracted from the worker to enable unit testing without a worker context.
 */

/** Serializable filter state (Sets converted to arrays for transfer). */
export interface SerializableFilter {
  type: 'number' | 'boolean' | 'string' | 'date'
  isEnabled: boolean
  min?: number
  max?: number
  selected?: boolean
  selectedValues?: string[]
  after?: string
  before?: string
  _selectedSet?: Set<string>
}

/**
 * Check if a value passes a single filter.
 *
 * @param value - The property value to test.
 * @param filter - The filter to apply.
 * @returns Whether the value passes.
 */
export function passesFilter(value: unknown, filter: SerializableFilter): boolean {
  switch (filter.type) {
    case 'number':
      return typeof value === 'number' && value >= filter.min! && value <= filter.max!
    case 'boolean':
      return value === filter.selected
    case 'string': {
      const set = filter._selectedSet as Set<string> | undefined
      return !set || set.size === 0 || (typeof value === 'string' && set.has(value))
    }
    case 'date':
      return typeof value === 'string' && value >= filter.after! && value <= filter.before!
  }
}

/**
 * Parse hex color to normalized [r, g, b] (each 0.0–1.0).
 *
 * @param hex - Hex color string (e.g. '#ff0000' or 'ff0000').
 * @returns Tuple of [r, g, b] in 0-1 range.
 */
export function hexToRgbNorm(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ]
}

/**
 * Interpolate between palette stops at parameter t ∈ [0,1].
 *
 * @param stops - Array of [r,g,b] color stops (normalized 0-1).
 * @param t - Interpolation parameter (0 = first stop, 1 = last stop).
 * @returns Interpolated [r,g,b] tuple.
 */
export function interpolateStops(
  stops: [number, number, number][],
  t: number,
): [number, number, number] {
  if (t <= 0) return stops[0]
  if (t >= 1) return stops[stops.length - 1]
  const segment = t * (stops.length - 1)
  const i = Math.floor(segment)
  const f = segment - i
  const a = stops[i]
  const b = stops[Math.min(i + 1, stops.length - 1)]
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ]
}
