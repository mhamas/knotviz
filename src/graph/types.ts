// ─── Input schema types (as stored in JSON) ───────────────────────────────

/** Raw property value as it appears in JSON. Booleans are native JS booleans;
 *  dates are ISO 8601 strings; numbers and strings are their native types.
 *  Arrays of strings are supported as a multi-valued property (string[]). */
export type PropertyValue = number | string | boolean | string[]

export interface NodeInput {
  id: string
  label?: string
  x?: number
  y?: number
  properties?: Record<string, PropertyValue | null>
}

export interface EdgeInput {
  source: string
  target: string
  label?: string
  weight?: number
}

/** Maps property key → { description } for node property documentation. */
export type NodePropertiesMetadata = Record<string, { description: string }>

export interface GraphData {
  version: string
  nodes: NodeInput[]
  edges: EdgeInput[]
  nodePropertiesMetadata?: NodePropertiesMetadata
}

// ─── Load-time warnings ────────────────────────────────────────────────────

/**
 * A non-fatal issue encountered while parsing an input file. Parsers continue
 * past the issue (dropping the offending value or row) but emit one of these
 * so the UI can summarise data-quality problems to the user instead of
 * silently swallowing them in the console.
 */
export interface LoadWarning {
  scope: 'nodes' | 'edges'
  kind: 'coercion'
  propertyKey?: string
  row: number
  value?: string
  message: string
}

/**
 * Aggregated per-column coercion warnings, produced by the loading worker
 * from the raw LoadWarning stream so the UI has one row per affected key.
 */
export interface CoercionWarningSummary {
  scope: 'nodes' | 'edges'
  propertyKey: string
  failedCount: number
  exampleValue?: string
  exampleMessage: string
}

export interface ParseOptions {
  /** Called once per non-fatal warning the parser encounters. */
  onWarning?: (warning: LoadWarning) => void
}

// ─── Property system ───────────────────────────────────────────────────────

export type PropertyType = 'number' | 'string' | 'string[]' | 'date' | 'boolean'

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
  isLogScale: boolean
  histogramBuckets: HistogramBucket[]
  logHistogramBuckets: HistogramBucket[]
}

export interface StringFilterState {
  type: 'string'
  isEnabled: boolean
  selectedValues: Set<string>
  allValues: string[]
}

export interface StringArrayFilterState {
  type: 'string[]'
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
  | StringArrayFilterState
  | DateFilterState
  | BooleanFilterState

/** Full filter map: propertyKey → FilterState */
export type FilterMap = Map<string, FilterState>

// ─── Stats ─────────────────────────────────────────────────────────────────

/** Descriptive statistics for a numeric property. */
export interface NumericStats {
  count: number
  sum: number
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
  | { type: 'numeric'; stats: NumericStats; histogram: HistogramBucket[] }
  | { type: 'date'; stats: DateStats; histogram: DateHistogramBucket[] }
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
  | 'Grays'
  | 'Tableau10'
  | 'Observable10'
  | 'Set2'
  | 'Dark2'
  | 'Paired'

/**
 * How a palette is meant to be used:
 * - `sequential`: single-hue gradient for ordered data (Blues, Viridis…)
 * - `diverging`: two-hue gradient with a neutral midpoint (RdBu, Spectral…)
 * - `qualitative`: fixed distinct colors for categorical data (Tableau10…)
 */
export type PaletteKind = 'sequential' | 'diverging' | 'qualitative'

export interface CustomPalette {
  id: string
  name: string
  colors: string[]
}

export type VisualMode = 'color' | 'size'

export interface ColorGradientState {
  propertyKey: string | null
  /** Built-in palette name or custom palette ID. */
  palette: string
  isReversed: boolean
  customColors: string[]
  customPalettes: CustomPalette[]
  visualMode: VisualMode
  /** [min, max] point size for size mode. Default [1, 10]. */
  sizeRange: [number, number]
  /** Use log scale for the visual mapping. Only affects numeric properties. */
  isLogScale: boolean
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
}
