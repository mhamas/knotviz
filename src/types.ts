// ─── Input schema types (as stored in JSON) ───────────────────────────────

/** Raw property value as it appears in JSON. Booleans are native JS booleans;
 *  dates are ISO 8601 strings; numbers and strings are their native types. */
export type PropertyValue = number | string | boolean

export interface NodeInput {
  id: string
  label?: string
  x?: number
  y?: number
  properties?: Record<string, PropertyValue>
}

export interface EdgeInput {
  source: string
  target: string
  label?: string
  weight?: number
}

export interface GraphData {
  version: string
  nodes: NodeInput[]
  edges: EdgeInput[]
}

// ─── Property system ───────────────────────────────────────────────────────

export type PropertyType = 'number' | 'string' | 'date' | 'boolean'

export interface PropertyMeta {
  key: string
  type: PropertyType
}

// ─── Filter state ──────────────────────────────────────────────────────────

export interface NumberFilterState {
  type: 'number'
  isEnabled: boolean
  min: number
  max: number
  domainMin: number
  domainMax: number
}

export interface StringFilterState {
  type: 'string'
  isEnabled: boolean
  selectedValues: Set<string>
  allValues: string[]
}

export interface DateFilterState {
  type: 'date'
  isEnabled: boolean
  after: string
  before: string
  domainMin: string
  domainMax: string
}

export interface BooleanFilterState {
  type: 'boolean'
  isEnabled: boolean
  selected: boolean
}

export type FilterState =
  | NumberFilterState
  | StringFilterState
  | DateFilterState
  | BooleanFilterState

/** Full filter map: propertyKey → FilterState */
export type FilterMap = Map<string, FilterState>

// ─── Stats ─────────────────────────────────────────────────────────────────

/** Descriptive statistics for a numeric property. */
export interface NumericStats {
  count: number
  min: number
  max: number
  mean: number
  median: number
  p10: number
  p20: number
  p25: number
  p30: number
  p40: number
  p50: number
  p60: number
  p70: number
  p75: number
  p80: number
  p90: number
}

/** Descriptive statistics for a date property. Values are YYYY-MM-DD strings. */
export interface DateStats {
  count: number
  min: string
  max: string
  mean: string
  median: string
  p10: string
  p20: string
  p25: string
  p30: string
  p40: string
  p50: string
  p60: string
  p70: string
  p75: string
  p80: string
  p90: string
}

/** Frequency counts for a string or boolean property. */
export type CategoricalStats = Map<string | boolean, number>

/** Serializable frequency counts (Map can't be structured-cloned via postMessage). */
export type SerializableCategoricalStats = [string | boolean, number][]

/** Union of stats results returned from the appearance worker. */
export type PropertyStatsResult =
  | { type: 'numeric'; stats: NumericStats }
  | { type: 'date'; stats: DateStats }
  | { type: 'categorical'; stats: SerializableCategoricalStats }

export interface HistogramBucket {
  from: number
  to: number
  count: number
}

export interface DateHistogramBucket {
  from: string
  to: string
  count: number
}

// ─── Color gradient ────────────────────────────────────────────────────────

export type PaletteName =
  | 'Viridis'
  | 'Plasma'
  | 'Magma'
  | 'Inferno'
  | 'Turbo'
  | 'Blues'
  | 'Reds'
  | 'Greens'
  | 'Oranges'
  | 'Purples'
  | 'Rainbow'
  | 'Spectral'
  | 'RdBu'
  | 'RdYlGn'
  | 'PiYG'
  | 'BlueOrange'
  | 'TealRose'
  | 'IndigoAmber'

export interface CustomPalette {
  id: string
  name: string
  colors: string[]
}

export interface ColorGradientState {
  propertyKey: string | null
  /** Built-in palette name or custom palette ID. */
  palette: string
  isReversed: boolean
  customColors: string[]
  customPalettes: CustomPalette[]
}

// ─── Tooltip ───────────────────────────────────────────────────────────────

export interface TooltipState {
  nodeId: string
  /** Pixel position relative to the canvas container. */
  x: number
  y: number
  /** Canvas bounds at the time the tooltip was opened. */
  canvasBounds: DOMRect
}

// ─── Loading pipeline ──────────────────────────────────────────────────────

export interface NullDefaultResult {
  data: GraphData
  replacementCount: number
}

export type PositionMode = 'all' | 'none' | 'partial'

// ─── Cosmos graph data ────────────────────────────────────────────────────

/** Pre-processed graph data optimised for @cosmos.gl/graph (index-based, Float32Array).
 *  Uses compact stores (parallel arrays indexed by node index) instead of full NodeInput/EdgeInput
 *  objects to minimise memory for 1M+ node graphs. */
export interface CosmosGraphData {
  /** Total number of nodes. */
  nodeCount: number
  /** Node IDs indexed by node index. */
  nodeIds: string[]
  /** Node labels indexed by node index (undefined = use nodeId). */
  nodeLabels: (string | undefined)[]
  /** Fast lookup: nodeId → index. */
  nodeIndexMap: Map<string, number>
  /** Initial positions as [x0,y0,x1,y1,…]. `undefined` when positions should be randomised by Cosmos. */
  initialPositions: Float32Array | undefined
  /** Links as [srcIdx0,tgtIdx0,srcIdx1,tgtIdx1,…] (index-based, ready for cosmos `setLinks`). */
  linkIndices: Float32Array
  /** Position mode detected from input. */
  positionMode: PositionMode
  /** Edge source node indices (for export). */
  edgeSources: Uint32Array
  /** Edge target node indices (for export). */
  edgeTargets: Uint32Array
  /** Edge labels (for export). */
  edgeLabels: (string | undefined)[]
  /** Edge weights (for export, undefined if no edges have weight). */
  edgeWeights: Float32Array | undefined
  /** Edge indices sorted by weight descending (for edge filtering). */
  edgeSortOrder: Uint32Array
  /** Maximum number of edges touching any single node. */
  maxDegree: number
}
