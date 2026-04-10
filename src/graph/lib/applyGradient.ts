/**
 * Pure function that applies a visual mapping (color or size) to per-node
 * arrays based on a property column. Extracted from the appearance worker
 * for testability.
 */

import type { VisualMode } from '../types'
import { interpolateStops } from './appearanceUtils'

/** Minimum point size for size mode. */
export const SIZE_MIN = 1
/** Maximum point size for size mode. */
export const SIZE_MAX = 10
type PropertyColumn = (number | string | boolean | string[] | undefined)[]

/** Optional configuration for visual modes. */
export interface VisualModeConfig {
  /** Custom [min, max] size range for size mode. Defaults to [SIZE_MIN, SIZE_MAX]. */
  sizeRange?: [number, number]
  /** Use log10(v+1) scaling for the t parameter. Only affects numeric properties. */
  isLogScale?: boolean
}

/**
 * Apply a visual mapping to per-node arrays.
 *
 * @param pointColors - RGBA Float32Array (4 floats per node). Modified in place.
 * @param pointSizes - Float32Array (1 float per node). Modified in place.
 * @param visible - Uint8Array bitmask (1 = visible, 0 = filtered out).
 * @param col - Property column values indexed by node index.
 * @param propType - Property type ('number', 'date', 'boolean', 'string', 'string[]').
 * @param stops - Palette color stops as normalized [r,g,b] tuples.
 * @param nodeCount - Total number of nodes.
 * @param mode - Visual mapping mode.
 * @param config - Optional size configuration.
 */
export function applyGradient(
  pointColors: Float32Array,
  pointSizes: Float32Array,
  visible: Uint8Array,
  col: PropertyColumn,
  propType: string,
  stops: [number, number, number][],
  nodeCount: number,
  mode: VisualMode,
  config?: VisualModeConfig,
): void {
  if (propType === 'number') {
    applyNumeric(pointColors, pointSizes, visible, col, nodeCount, stops, mode, config)
  } else if (propType === 'date') {
    applyDate(pointColors, pointSizes, visible, col, nodeCount, stops, mode, config)
  } else if (propType === 'boolean') {
    applyBoolean(pointColors, pointSizes, visible, col, nodeCount, stops, mode, config)
  } else if (propType === 'string' || propType === 'string[]') {
    applyString(pointColors, pointSizes, visible, col, nodeCount, stops, mode, config)
  }
}

/** Apply the visual value for a single node given its t ∈ [0,1]. */
function applyValue(
  pointColors: Float32Array,
  pointSizes: Float32Array,
  i: number,
  t: number,
  stops: [number, number, number][],
  mode: VisualMode,
  config?: VisualModeConfig,
): void {
  if (mode === 'color') {
    const [r, g, b] = interpolateStops(stops, t)
    const off = i * 4
    pointColors[off] = r
    pointColors[off + 1] = g
    pointColors[off + 2] = b
    pointColors[off + 3] = 1
  } else if (mode === 'size') {
    const [sMin, sMax] = config?.sizeRange ?? [SIZE_MIN, SIZE_MAX]
    pointSizes[i] = sMin + Math.sqrt(t) * (sMax - sMin)
  }
}

function applyNumeric(
  pointColors: Float32Array,
  pointSizes: Float32Array,
  visible: Uint8Array,
  col: PropertyColumn,
  nodeCount: number,
  stops: [number, number, number][],
  mode: VisualMode,
  config?: VisualModeConfig,
): void {
  let min = Infinity, max = -Infinity
  for (let i = 0; i < nodeCount; i++) {
    if (!visible[i]) continue
    const v = col[i]
    if (typeof v !== 'number') continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!isFinite(min)) return
  const isLog = config?.isLogScale && min >= 0
  const logMin = isLog ? Math.log10(min + 1) : 0
  const logMax = isLog ? Math.log10(max + 1) : 0
  const range = isLog ? logMax - logMin : max - min
  for (let i = 0; i < nodeCount; i++) {
    if (!visible[i]) continue
    const v = col[i]
    if (typeof v !== 'number') continue
    const mapped = isLog ? Math.log10(v + 1) : v
    const base = isLog ? logMin : min
    const t = range === 0 ? 0.5 : (mapped - base) / range
    applyValue(pointColors, pointSizes, i, t, stops, mode, config)
  }
}

function applyDate(
  pointColors: Float32Array,
  pointSizes: Float32Array,
  visible: Uint8Array,
  col: PropertyColumn,
  nodeCount: number,
  stops: [number, number, number][],
  mode: VisualMode,
  config?: VisualModeConfig,
): void {
  let min = Infinity, max = -Infinity
  const timestamps = new Float64Array(nodeCount)
  for (let i = 0; i < nodeCount; i++) {
    if (!visible[i]) continue
    const v = col[i]
    if (typeof v !== 'string') continue
    const ts = new Date(v).getTime()
    if (isNaN(ts)) continue
    timestamps[i] = ts
    if (ts < min) min = ts
    if (ts > max) max = ts
  }
  if (!isFinite(min)) return
  const isLog = config?.isLogScale && min >= 0
  const logMin = isLog ? Math.log10(min + 1) : 0
  const logMax = isLog ? Math.log10(max + 1) : 0
  const range = isLog ? logMax - logMin : max - min
  for (let i = 0; i < nodeCount; i++) {
    if (!visible[i] || typeof col[i] !== 'string') continue
    const mapped = isLog ? Math.log10(timestamps[i] + 1) : timestamps[i]
    const base = isLog ? logMin : min
    const t = range === 0 ? 0.5 : (mapped - base) / range
    applyValue(pointColors, pointSizes, i, t, stops, mode, config)
  }
}

function applyBoolean(
  pointColors: Float32Array,
  pointSizes: Float32Array,
  visible: Uint8Array,
  col: PropertyColumn,
  nodeCount: number,
  stops: [number, number, number][],
  mode: VisualMode,
  config?: VisualModeConfig,
): void {
  for (let i = 0; i < nodeCount; i++) {
    if (!visible[i]) continue
    const v = col[i]
    if (typeof v !== 'boolean') continue
    const t = v ? 1 : 0
    applyValue(pointColors, pointSizes, i, t, stops, mode, config)
  }
}

function applyString(
  pointColors: Float32Array,
  pointSizes: Float32Array,
  visible: Uint8Array,
  col: PropertyColumn,
  nodeCount: number,
  stops: [number, number, number][],
  mode: VisualMode,
  config?: VisualModeConfig,
): void {
  const distinctMap = new Map<string, number>()
  const distinctValues: string[] = []
  for (let i = 0; i < nodeCount; i++) {
    if (!visible[i]) continue
    const raw = col[i]
    const v = Array.isArray(raw) ? raw[0] : raw
    if (typeof v !== 'string') continue
    if (!distinctMap.has(v)) {
      distinctMap.set(v, distinctValues.length)
      distinctValues.push(v)
    }
  }
  distinctValues.sort()
  distinctMap.clear()
  for (let i = 0; i < distinctValues.length; i++) {
    distinctMap.set(distinctValues[i], i)
  }
  const count = distinctValues.length
  for (let i = 0; i < nodeCount; i++) {
    if (!visible[i]) continue
    const raw = col[i]
    const v = Array.isArray(raw) ? raw[0] : raw
    if (typeof v !== 'string') continue
    const idx = distinctMap.get(v)!
    if (mode === 'color') {
      const stopIdx = idx % stops.length
      const [r, g, b] = stops[stopIdx]
      const off = i * 4
      pointColors[off] = r
      pointColors[off + 1] = g
      pointColors[off + 2] = b
      pointColors[off + 3] = 1
    } else {
      // For size mode, spread string values evenly across [0, 1]
      const t = count <= 1 ? 0.5 : idx / (count - 1)
      applyValue(pointColors, pointSizes, i, t, stops, mode, config)
    }
  }
}
