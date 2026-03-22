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

export interface PropertyStats {
  min: number
  max: number
  mean: number
  median: number
  p25: number
  p75: number
}

export interface HistogramBucket {
  from: number
  to: number
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
  /** Maps nodeId → list of property keys that were replaced with type defaults. */
  defaultedByNode: Map<string, string[]>
}

export type PositionMode = 'all' | 'none' | 'partial'

// ─── Cosmos graph data ────────────────────────────────────────────────────

/** Pre-processed graph data optimised for @cosmos.gl/graph (index-based, Float32Array). */
export interface CosmosGraphData {
  /** Original validated nodes (properties, labels live here). */
  nodes: NodeInput[]
  /** Original validated edges. */
  edges: EdgeInput[]
  /** Fast lookup: nodeId → index in the `nodes` array. */
  nodeIndexMap: Map<string, number>
  /** Initial positions as [x0,y0,x1,y1,…]. `undefined` when positions should be randomised by Cosmos. */
  initialPositions: Float32Array | undefined
  /** Links as [srcIdx0,tgtIdx0,srcIdx1,tgtIdx1,…] (index-based, ready for cosmos `setLinks`). */
  linkIndices: Float32Array
  /** Map of nodeId → Set of neighbor nodeIds (for highlight-neighbors). */
  adjacency: Map<string, Set<string>>
  /** Map of nodeId → Set of edge indices touching this node. */
  nodeEdgeIndices: Map<string, Set<number>>
  /** Position mode detected from input. */
  positionMode: PositionMode
  /** Map from nodeId → list of property keys that were defaulted. */
  defaultedByNode: Map<string, string[]>
}
