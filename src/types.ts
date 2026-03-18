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
  after: string | null
  before: string | null
}

export interface BooleanFilterState {
  type: 'boolean'
  isEnabled: boolean
  selected: 'true' | 'false' | 'either'
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

export type PaletteName = 'Viridis' | 'Plasma' | 'Blues' | 'Reds' | 'Rainbow' | 'RdBu'

export interface ColorGradientState {
  propertyKey: string | null
  palette: PaletteName
  customColors: string[]
}

// ─── Tooltip ───────────────────────────────────────────────────────────────

export interface TooltipState {
  nodeId: string
  /** Pixel position relative to the Sigma canvas container. */
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
