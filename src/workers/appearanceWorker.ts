/**
 * Web Worker: computes filter matching + node colors + sizes + link colors.
 * Runs the entire heavy pipeline off the main thread.
 */

/** Serializable filter state (Sets converted to arrays for transfer). */
interface SerializableFilter {
  type: 'number' | 'boolean' | 'string' | 'date'
  isEnabled: boolean
  // number
  min?: number
  max?: number
  // boolean
  selected?: boolean
  // string
  selectedValues?: string[]
  // date
  after?: string
  before?: string
  // runtime: Set built from selectedValues array for O(1) lookup
  _selectedSet?: Set<string>
}

interface WorkerInput {
  /** Number of nodes */
  nodeCount: number
  /** Per-property columnar values: { key: values[nodeIndex] }. Values are number|string|boolean|undefined. */
  propertyColumns: Record<string, (number | string | boolean | undefined)[]>
  /** Filter state per property key */
  filters: Record<string, SerializableFilter>
  /** Sparse node colors: [nodeIndex, r, g, b, a, nodeIndex, r, g, b, a, ...] */
  gradientEntries: Float32Array
  /** Default RGBA for visible nodes with no gradient */
  defaultRgba: [number, number, number, number]
  /** Edge default RGBA */
  edgeRgba: [number, number, number, number]
  /** Link indices (source/target pairs by node index) */
  linkIndices: Float32Array
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
  gradientEntries: Float32Array
  defaultRgba: [number, number, number, number]
  edgeRgba: [number, number, number, number]
}

self.onmessage = (e: MessageEvent<InitMessage | UpdateMessage | WorkerInput>): void => {
  const input = e.data

  // Handle init message: store columns + link indices for reuse
  if ('type' in input && input.type === 'init') {
    storedColumns = input.propertyColumns
    storedLinkIndices = input.linkIndices
    return
  }

  // Handle update message (or legacy full message)
  const isUpdate = 'type' in input && input.type === 'update'
  const nodeCount = isUpdate ? (input as UpdateMessage).nodeCount : (input as WorkerInput).nodeCount
  const propertyColumns = isUpdate ? storedColumns : (input as WorkerInput).propertyColumns
  const filters = isUpdate ? (input as UpdateMessage).filters : (input as WorkerInput).filters
  const gradientEntries = isUpdate ? (input as UpdateMessage).gradientEntries : (input as WorkerInput).gradientEntries
  const defaultRgba = isUpdate ? (input as UpdateMessage).defaultRgba : (input as WorkerInput).defaultRgba
  const edgeRgba = isUpdate ? (input as UpdateMessage).edgeRgba : (input as WorkerInput).edgeRgba
  const linkIndices = isUpdate ? storedLinkIndices : (input as WorkerInput).linkIndices

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
    // Pre-resolve column arrays for enabled filters
    const columns = enabledFilters.map(([key]) => propertyColumns[key])
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

  // Apply default colors for all visible nodes
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

  // Override with gradient colors (sparse entries: [index, r, g, b, a, ...])
  for (let i = 0; i < gradientEntries.length; i += 5) {
    const idx = gradientEntries[i]
    if (!visible[idx]) continue
    const off = idx * 4
    pointColors[off] = gradientEntries[i + 1]
    pointColors[off + 1] = gradientEntries[i + 2]
    pointColors[off + 2] = gradientEntries[i + 3]
    pointColors[off + 3] = gradientEntries[i + 4]
  }

  // Step 3: Link colors
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

  // Step 4: Count matching nodes
  let matchingCount = 0
  for (let i = 0; i < nodeCount; i++) {
    if (visible[i]) matchingCount++
  }

  const msg = { pointColors, pointSizes, linkColors, visible, matchingCount, hasActiveFilters }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(self.postMessage as any)(msg, [
    pointColors.buffer, pointSizes.buffer, linkColors.buffer, visible.buffer,
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
