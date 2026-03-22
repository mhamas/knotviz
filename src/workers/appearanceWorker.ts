/**
 * Web Worker: computes filter matching + gradient colors + node sizes + link colors.
 * Runs the entire heavy appearance pipeline off the main thread.
 */

interface SerializableFilter {
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

interface GradientConfig {
  propertyKey: string | null
  paletteStops: string[]
  propType: string | null
}

// Persistent state: columns sent once on graph load, reused across messages
let storedColumns: Record<string, (number | string | boolean | undefined)[]> = {}
let storedLinkIndices: Float32Array = new Float32Array(0)

interface InitMessage {
  type: 'init'
  propertyColumns: Record<string, (number | string | boolean | undefined)[]>
  linkIndices: Float32Array
}

interface UpdateMessage {
  type: 'update'
  nodeCount: number
  filters: Record<string, SerializableFilter>
  gradientConfig: GradientConfig
  defaultRgba: [number, number, number, number]
  edgeRgba: [number, number, number, number]
}

self.onmessage = (e: MessageEvent<InitMessage | UpdateMessage>): void => {
  const input = e.data

  if (input.type === 'init') {
    storedColumns = input.propertyColumns
    storedLinkIndices = input.linkIndices
    return
  }

  const { nodeCount, filters, gradientConfig, defaultRgba, edgeRgba } = input
  const linkIndices = storedLinkIndices

  // Step 1: Compute matching bitmask
  const enabledFilters: [string, SerializableFilter][] = []
  for (const [key, f] of Object.entries(filters)) {
    if (f.isEnabled) enabledFilters.push([key, f])
  }

  // Convert string filter selectedValues from arrays to Sets for O(1) lookup
  for (const [, f] of enabledFilters) {
    if (f.type === 'string' && f.selectedValues && Array.isArray(f.selectedValues)) {
      f._selectedSet = new Set(f.selectedValues)
    }
  }

  const hasActiveFilters = enabledFilters.length > 0
  const visible = new Uint8Array(nodeCount)

  if (!hasActiveFilters) {
    visible.fill(1)
  } else {
    const columns = enabledFilters.map(([key]) => storedColumns[key])
    for (let i = 0; i < nodeCount; i++) {
      let isPass = true
      for (let f = 0; f < enabledFilters.length; f++) {
        const filter = enabledFilters[f][1]
        const value = columns[f]?.[i]
        if (!passesFilter(value, filter)) {
          isPass = false
          break
        }
      }
      visible[i] = isPass ? 1 : 0
    }
  }

  // Step 2: Build per-node RGBA + sizes
  const pointColors = new Float32Array(nodeCount * 4)
  const pointSizes = new Float32Array(nodeCount)

  const [dr, dg, db, da] = defaultRgba
  for (let i = 0; i < nodeCount; i++) {
    if (!visible[i]) continue
    const off = i * 4
    pointColors[off] = dr
    pointColors[off + 1] = dg
    pointColors[off + 2] = db
    pointColors[off + 3] = da
    pointSizes[i] = 4
  }

  // Step 3: Gradient coloring (computed here, no hex intermediary)
  if (gradientConfig.propertyKey && gradientConfig.paletteStops.length > 0 && gradientConfig.propType) {
    const col = storedColumns[gradientConfig.propertyKey]
    if (col) {
      const stops = gradientConfig.paletteStops.map(hexToRgbNorm)
      applyGradient(pointColors, visible, col, gradientConfig.propType, stops, nodeCount)
    }
  }

  // Step 4: Link colors
  let linkColors: Float32Array
  if (hasActiveFilters) {
    const linkCount = linkIndices.length / 2
    linkColors = new Float32Array(linkCount * 4)
    const [er0, er1, er2, er3] = edgeRgba
    for (let i = 0; i < linkCount; i++) {
      if (visible[linkIndices[i * 2]] && visible[linkIndices[i * 2 + 1]]) {
        const off = i * 4
        linkColors[off] = er0
        linkColors[off + 1] = er1
        linkColors[off + 2] = er2
        linkColors[off + 3] = er3
      }
    }
  } else {
    linkColors = new Float32Array(0)
  }

  // Step 5: Count matching nodes
  let matchingCount = 0
  for (let i = 0; i < nodeCount; i++) {
    if (visible[i]) matchingCount++
  }

  const msg = { pointColors, pointSizes, linkColors, matchingCount }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(self.postMessage as any)(msg, [
    pointColors.buffer, pointSizes.buffer, linkColors.buffer,
  ])
}

function passesFilter(value: unknown, filter: SerializableFilter): boolean {
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

/** Parse hex to normalized [r, g, b] (0-1). */
function hexToRgbNorm(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ]
}

/** Interpolate between palette stops at parameter t ∈ [0,1]. */
function interpolateStops(stops: [number, number, number][], t: number): [number, number, number] {
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

/** Apply gradient colors directly into pointColors for visible nodes. */
function applyGradient(
  pointColors: Float32Array,
  visible: Uint8Array,
  col: (number | string | boolean | undefined)[],
  propType: string,
  stops: [number, number, number][],
  nodeCount: number,
): void {
  if (propType === 'number') {
    // Find min/max
    let min = Infinity, max = -Infinity
    for (let i = 0; i < nodeCount; i++) {
      if (!visible[i]) continue
      const v = col[i]
      if (typeof v !== 'number') continue
      if (v < min) min = v
      if (v > max) max = v
    }
    if (!isFinite(min)) return
    const range = max - min
    for (let i = 0; i < nodeCount; i++) {
      if (!visible[i]) continue
      const v = col[i]
      if (typeof v !== 'number') continue
      const t = range === 0 ? 0.5 : (v - min) / range
      const [r, g, b] = interpolateStops(stops, t)
      const off = i * 4
      pointColors[off] = r
      pointColors[off + 1] = g
      pointColors[off + 2] = b
      pointColors[off + 3] = 1
    }
  } else if (propType === 'date') {
    // Parse dates to timestamps, find min/max
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
    const range = max - min
    for (let i = 0; i < nodeCount; i++) {
      if (!visible[i] || typeof col[i] !== 'string') continue
      const t = range === 0 ? 0.5 : (timestamps[i] - min) / range
      const [r, g, b] = interpolateStops(stops, t)
      const off = i * 4
      pointColors[off] = r
      pointColors[off + 1] = g
      pointColors[off + 2] = b
      pointColors[off + 3] = 1
    }
  } else if (propType === 'boolean') {
    const falseColor = stops[0]
    const trueColor = stops[stops.length - 1]
    for (let i = 0; i < nodeCount; i++) {
      if (!visible[i]) continue
      const v = col[i]
      if (typeof v !== 'boolean') continue
      const [r, g, b] = v ? trueColor : falseColor
      const off = i * 4
      pointColors[off] = r
      pointColors[off + 1] = g
      pointColors[off + 2] = b
      pointColors[off + 3] = 1
    }
  } else if (propType === 'string') {
    // Collect distinct values, map to colors round-robin
    const distinctMap = new Map<string, number>()
    const distinctValues: string[] = []
    for (let i = 0; i < nodeCount; i++) {
      if (!visible[i]) continue
      const v = col[i]
      if (typeof v !== 'string') continue
      if (!distinctMap.has(v)) {
        distinctMap.set(v, distinctValues.length)
        distinctValues.push(v)
      }
    }
    distinctValues.sort()
    // Rebuild map after sort
    distinctMap.clear()
    for (let i = 0; i < distinctValues.length; i++) {
      distinctMap.set(distinctValues[i], i)
    }
    for (let i = 0; i < nodeCount; i++) {
      if (!visible[i]) continue
      const v = col[i]
      if (typeof v !== 'string') continue
      const idx = distinctMap.get(v)!
      const stopIdx = idx % stops.length
      const [r, g, b] = stops[stopIdx]
      const off = i * 4
      pointColors[off] = r
      pointColors[off + 1] = g
      pointColors[off + 2] = b
      pointColors[off + 3] = 1
    }
  }
}
