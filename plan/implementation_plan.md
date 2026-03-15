# Graph Visualizer — Implementation Plan

---

## Overview

Single-page React + TypeScript app. Drag-and-drop a JSON graph file → visualise it with Sigma.js + Graphology → run ForceAtlas2 simulation → filter, inspect, colour, export.

This document is the **how to build it** companion to `product_specification.md` (the **what to build** source of truth). When the two disagree, the spec wins.

Build order follows the roadmap: **R1 Core Viewer → R2 Filter System → R3 Stats + Export → R4 Color**.

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Graph rendering | `sigma` v3 |
| Graph data model | `graphology` |
| Spring layout | `graphology-layout-forceatlas2` (Web Worker) |
| UI components | shadcn/ui (Radix UI primitives + Tailwind CSS) |
| Styling | Tailwind CSS v3 (4px base spacing unit) |
| Build tool | Vite |
| Unit testing | Vitest |
| E2E testing | Playwright |
| Linting/formatting | ESLint + Prettier |

---

## Project Setup

### 1. Scaffold

```bash
npm create vite@latest . -- --template react-ts
npm install sigma graphology graphology-layout-forceatlas2 graphology-layout-random graphology-types
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
npx shadcn@latest add button slider checkbox tabs select popover command radio-group alert-dialog
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/jest-dom
npm install -D @playwright/test
npx playwright install
```

### 2. `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
})
```

### 3. `tailwind.config.js`

```js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

### 4. `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 5. `package.json` scripts

```json
{
  "dev":           "vite",
  "build":         "tsc && vite build",
  "preview":       "vite preview",
  "test":          "vitest run",
  "test:watch":    "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e":      "playwright test",
  "test:e2e:ui":   "playwright test --ui",
  "lint":          "eslint src --ext .ts,.tsx",
  "format":        "prettier --write src"
}
```

### 6. `.eslintrc.cjs`

```js
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
  },
}
```

`.prettierrc`:
```json
{ "semi": false, "singleQuote": true, "trailingComma": "es5", "printWidth": 100 }
```

---

## File Structure

```
grapphy/
├── e2e/
│   ├── fixtures/
│   │   ├── sample-graph.json
│   │   └── partial-positions-graph.json   ← some nodes have x/y, some don't (DoD 41)
│   ├── drop-zone.spec.ts
│   ├── simulation.spec.ts
│   ├── filters.spec.ts
│   ├── stats.spec.ts
│   ├── color.spec.ts
│   └── export-roundtrip.spec.ts
├── src/
│   ├── components/
│   │   ├── DropZone.tsx
│   │   ├── ErrorBoundary.tsx              ← React Error Boundary wrapping GraphView
│   │   ├── GraphView.tsx
│   │   ├── LeftSidebar.tsx
│   │   ├── RightSidebar.tsx
│   │   ├── FiltersTab.tsx
│   │   ├── StatsTab.tsx
│   │   ├── ColorTab.tsx
│   │   ├── PropertyFilterPanel.tsx
│   │   ├── filters/
│   │   │   ├── NumberFilter.tsx
│   │   │   ├── StringFilter.tsx
│   │   │   ├── DateFilter.tsx
│   │   │   └── BooleanFilter.tsx
│   │   ├── NodeTooltip.tsx
│   │   ├── Histogram.tsx
│   │   └── ui/                  ← shadcn/ui copies live here
│   ├── hooks/
│   │   ├── useFA2Simulation.ts
│   │   ├── useFilterState.ts
│   │   ├── useNodeColors.ts
│   │   ├── useColorGradient.ts
│   │   └── useDebounce.ts
│   │   NOTE: CLAUDE.md lists usePropertyAnalysis.ts — that is an outdated name.
│   │   The three hooks above supersede it. Do not create usePropertyAnalysis.ts.
│   ├── lib/
│   │   ├── graphSchema.json
│   │   ├── parseJSON.ts
│   │   ├── validateGraph.ts
│   │   ├── applyNullDefaults.ts
│   │   ├── buildGraph.ts
│   │   ├── detectPropertyTypes.ts
│   │   ├── computeStats.ts
│   │   ├── computeHistogram.ts
│   │   └── colorScales.ts
│   ├── test/
│   │   ├── setup.ts
│   │   ├── validateGraph.test.ts
│   │   ├── applyNullDefaults.test.ts
│   │   ├── buildGraph.test.ts
│   │   ├── detectPropertyTypes.test.ts
│   │   ├── computeStats.test.ts
│   │   └── computeHistogram.test.ts
│   ├── types.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── playwright.config.ts
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .eslintrc.cjs
└── .prettierrc
```

---

## Type Definitions (`src/types.ts`)

```ts
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
  min: number           // current handle positions
  max: number
  domainMin: number     // full data range, never changes
  domainMax: number
}

export interface StringFilterState {
  type: 'string'
  isEnabled: boolean
  selectedValues: Set<string>
  allValues: string[]   // sorted distinct values from data
}

export interface DateFilterState {
  type: 'date'
  isEnabled: boolean
  after: string | null   // ISO 8601 or null (no lower bound)
  before: string | null  // ISO 8601 or null (no upper bound)
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
  from: number   // inclusive
  to: number     // exclusive (last bucket is inclusive on right)
  count: number
}

// ─── Color gradient ────────────────────────────────────────────────────────

export type PaletteName = 'Viridis' | 'Plasma' | 'Blues' | 'Reds' | 'Rainbow' | 'RdBu'

export interface ColorGradientState {
  propertyKey: string | null
  palette: PaletteName
  customColors: string[]   // extra hex colors appended to palette for this session
}

// ─── Tooltip ───────────────────────────────────────────────────────────────

export interface TooltipState {
  nodeId: string
  /** Pixel position relative to the Sigma canvas container. */
  x: number
  y: number
}

// ─── Loading pipeline ──────────────────────────────────────────────────────

export interface NullDefaultResult {
  data: GraphData
  replacementCount: number
  /** Maps nodeId → list of property keys that were replaced with type defaults.
   *  Passed to buildGraph so it can set `_defaultedProperties` on each node attribute.
   *  Empty map when replacementCount === 0. */
  defaultedByNode: Map<string, string[]>
}

export type PositionMode = 'all' | 'none' | 'partial'
```

---

## Data Loading Pipeline

Four pure functions called in sequence. All run before any UI update.

```
parseJSON → validateGraph → applyNullDefaults → buildGraph(nullDefaultResult)
```

`buildGraph` receives the full `NullDefaultResult` (not just `GraphData`) so it can populate
`_defaultedProperties` on each node's Graphology attributes without a second pass.

### `lib/parseJSON.ts`

```ts
/**
 * Parses raw file text into a JavaScript object.
 *
 * @throws {Error} "Invalid JSON file" on parse failure.
 * @example
 * const raw = parseJSON('{"version":"1","nodes":[],"edges":[]}')
 */
export function parseJSON(text: string): unknown
```

### `lib/validateGraph.ts`

```ts
/**
 * Validates a raw JS object against the versioned graph schema.
 * Schema file: src/lib/graphSchema.json
 *
 * Validation rules:
 * - `version` must be present and equal to `"1"`
 * - `nodes` and `edges` must be arrays
 * - Each node must have a string `id`
 * - Each edge must have string `source` and `target`
 * - `properties` values must be number | string | boolean (date strings are strings)
 *
 * Non-fatal skips (logged via console.warn, not thrown):
 * - Node missing `id` → skip node
 * - Edge referencing unknown node id → skip edge
 * - Property value of wrong type → treat as null (handled by applyNullDefaults)
 *
 * Exact thrown error messages (use these strings verbatim — tests assert on them):
 * - Missing or wrong `version`:  "Unsupported schema version"
 * - Missing `nodes` or `edges`:  "File must contain nodes and edges arrays"
 * - `nodes` is not an array:     "File must contain nodes and edges arrays"
 * - Zero nodes after filtering:  "Graph has no nodes to display"
 *
 * @throws {Error} Human-readable message on fatal schema violation.
 * @example
 * const data = validateGraph(parseJSON(fileText))
 */
export function validateGraph(raw: unknown): GraphData
```

### `lib/applyNullDefaults.ts`

```ts
/**
 * Detects missing property values across all nodes and replaces them with
 * type defaults. Type detection happens here first (via detectPropertyTypes).
 *
 * Defaults: number → 0 | string → "" | boolean → false | date → "1970-01-01"
 *
 * Returns the mutated data and total replacement count.
 * If count is 0, no replacements occurred (no modal needed).
 *
 * @example
 * const { data, replacementCount } = applyNullDefaults(validatedGraph)
 */
export function applyNullDefaults(data: GraphData): NullDefaultResult
```

### `lib/buildGraph.ts`

```ts
/**
 * Converts validated, normalised GraphData into a Graphology MultiGraph.
 * Applies position-aware loading logic (all/partial/none positions).
 *
 * Position logic:
 * - All nodes have x+y → use as-is (PositionMode: 'all')
 * - Some nodes have x+y → ignore all, randomise (PositionMode: 'partial')
 * - No nodes have x+y → randomise all (PositionMode: 'none')
 *
 * Random positions are drawn from a unit square [-0.5, 0.5] × [-0.5, 0.5]
 * so FA2 starts from a compact cluster.
 *
 * Node attributes set on each node (in addition to x, y):
 *   { color, size, label, _defaultedProperties: string[] }
 * `_defaultedProperties` is the list of property keys replaced with type defaults.
 * Read from `nullDefaultResult.defaultedByNode.get(node.id) ?? []`.
 * Used by NodeTooltip to suppress "N days ago" for defaulted date values.
 *
 * @param nullDefaultResult - the full result from applyNullDefaults (includes defaultedByNode)
 * @returns { graph, positionMode }
 * @example
 * const nullResult = applyNullDefaults(validatedData)
 * const { graph, positionMode } = buildGraph(nullResult)
 */
export function buildGraph(nullDefaultResult: NullDefaultResult): { graph: Graph; positionMode: PositionMode }
```

---

## Library Functions

### `lib/detectPropertyTypes.ts`

```ts
/**
 * Infers the type of every property key by sampling all node values.
 *
 * Rules (applied in order):
 * 1. All non-null values are JS booleans → 'boolean'
 * 2. All non-null values are JS numbers → 'number'
 * 3. 100% of non-null values match the ISO 8601 date regex → 'date'
 * 4. Otherwise → 'string'
 *
 * ISO 8601 validation regex (applied per non-null value):
 *   /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/
 * Accepts date-only ("2021-03-15") and datetime formats.
 * Rejects ambiguous strings like "2021", "Q1 2021", "March 15".
 * Does NOT validate calendar correctness (e.g. "2021-13-45") — out of scope.
 * Edge case: if all values are null/undefined → default to 'number' (safe fallback).
 *
 * Called once per graph load, result is stable for the session.
 *
 * @returns Map<propertyKey, PropertyType>
 * @example
 * detectPropertyTypes(graphData.nodes)
 * // → Map { 'age' → 'number', 'joined' → 'date', 'active' → 'boolean', 'status' → 'string' }
 */
export function detectPropertyTypes(nodes: NodeInput[]): Map<string, PropertyType>
```

### `lib/computeStats.ts`

```ts
/**
 * Computes descriptive statistics for an array of numeric values.
 * Null/undefined are excluded from all calculations.
 * Requires at least one non-null value; returns null if array is empty or all-null.
 * NOTE: Stats cover number properties only. Date values (ISO strings) are never
 * passed here — StatsTab filters to number-type properties before calling this function.
 *
 * @example
 * computeStats([1, 2, 3, 4, 5])
 * // → { min: 1, max: 5, mean: 3, median: 3, p25: 2, p75: 4 }
 */
export function computeStats(values: Array<number | null | undefined>): PropertyStats | null
```

### `lib/computeHistogram.ts`

```ts
/**
 * Divides values into evenly-spaced buckets using Sturges' rule:
 *   buckets = ceil(log2(n) + 1), clamped to [3, 20]
 *
 * Returns an empty array for empty input.
 * The last bucket's `to` boundary is inclusive.
 * min === max guard: when all values are identical, produce 3 buckets each with
 * width 0 — all values fall into the first bucket. Never divide by zero.
 *
 * @example
 * computeHistogram([1, 2, 3, 4, 5])
 * // → [{ from: 1, to: 2.33, count: 2 }, { from: 2.33, to: 3.67, count: 1 }, ...]
 */
export function computeHistogram(values: number[]): HistogramBucket[]
```

### `lib/colorScales.ts`

```ts
/**
 * Returns an interpolated hex color for a normalised position t ∈ [0, 1]
 * in the given palette.
 *
 * @example
 * interpolatePalette('Viridis', 0)   // → '#440154' (dark purple)
 * interpolatePalette('Viridis', 0.5) // → '#21908c' (teal)
 * interpolatePalette('Viridis', 1)   // → '#fde725' (yellow)
 */
export function interpolatePalette(palette: PaletteName, t: number): string

/**
 * Returns the list of discrete hex stop colors for a palette.
 * Custom colors are appended after the built-in stops.
 */
export function getPaletteColors(palette: PaletteName, customColors: string[]): string[]
```

---

## Hooks

### `hooks/useFA2Simulation.ts`

```ts
export interface SimulationSettings {
  gravity: number    // FA2 `gravity`, default 1.0, range [0.1, 10.0], log scale
  speed: number      // FA2 `scalingRatio`, default 1.0, range [0.1, 10.0], log scale
}

export interface FA2SimulationHandle {
  isRunning: boolean
  errorMessage: string | null
  start: () => void
  stop: () => void
  randomizeLayout: () => void  // stop → randomise positions → restart if was running
}

/**
 * Manages a ForceAtlas2 Web Worker simulation for a Graphology graph.
 *
 * Slider change cycle: debounce 150ms → stop() → wait for worker confirmation
 * → update settings → start(). Prevents rapid slider drags from issuing
 * multiple stop/start calls before the worker finishes.
 *
 * IMPORTANT — stop is asynchronous. The FA2 worker emits a 'stop' event when
 * it has fully halted. Never call start() immediately after stop() in the same
 * tick — it will race. Always wait for the event:
 *
 * ```ts
 * layout.once('stop', () => {
 *   layout.updateSettings(newSettings)
 *   layout.start()
 * })
 * layout.stop()
 * ```
 *
 * randomizeLayout() cycle:
 *   1. Record isRunning state.
 *   2. stop() (if running) and wait for 'stop' event.
 *   3. Randomize all node x/y positions:
 *      import { random } from 'graphology-layout-random'
 *      random.assign(graph, { scale: 1, center: 0 })
 *   4. sigma.fit() to reset camera.
 *   5. Restart only if was running in step 1.
 *
 * Worker error sources — handle both:
 *   - `layout.on('killed', handler)` — FA2 library-level termination (e.g. out of memory)
 *   - `layout.supervisor.worker.onerror = handler` — unhandled JS exception in worker
 *   Both paths: set errorMessage = "Simulation failed — reload file to continue.",
 *   mark isRunning = false. errorMessage persists until the user loads a new file.
 * Cleanup: layout.kill() on unmount.
 *
 * @example
 * const { isRunning, start, stop, randomizeLayout } = useFA2Simulation(graph, settings)
 */
export function useFA2Simulation(
  graph: Graph | null,
  settings: SimulationSettings
): FA2SimulationHandle
```

FA2 worker import:
```ts
import FA2Layout from 'graphology-layout-forceatlas2/worker'
```

### `hooks/useFilterState.ts`

```ts
export interface FilterStateHandle {
  filters: FilterMap
  setNumberFilter: (key: string, min: number, max: number) => void
  setStringFilter: (key: string, values: Set<string>) => void
  setDateFilter: (key: string, after: string | null, before: string | null) => void
  setBooleanFilter: (key: string, selected: BooleanFilterState['selected']) => void
  setFilterEnabled: (key: string, isEnabled: boolean) => void
  clearAllFilters: () => void
  /** IDs of nodes that pass all enabled filters. Updated on every filter change. */
  matchingNodeIds: Set<string>
}

/**
 * Manages filter state for all properties. Initialises a FilterState per
 * property from PropertyMeta[]. Recomputes matchingNodeIds synchronously
 * on every filter change (no async work).
 *
 * INTERNAL VALUE INDEX — built once on graph load, never rebuilt:
 * ```ts
 * const nodeValueIndex = new Map<string, Map<string, PropertyValue>>()
 * // propertyKey → Map<nodeId, value>
 * // Built by iterating graph.forEachNode once per property key.
 * // All filter evaluations read from this index, not from graph attributes directly.
 * // This keeps each filter change at O(nodes × enabledFilters) with cheap lookups.
 * ```
 *
 * STRING FILTER INITIALISATION — runs once per string property on load:
 * - Collect all distinct non-null values for the property from nodeValueIndex.
 * - Sort alphabetically.
 * - If `allValues.length === 0` (all null/absent): set `selectedValues = new Set()` (all nodes pass).
 * - If `allValues.length <= 50`: set `selectedValues = new Set(allValues)` (all pre-selected).
 * - If `allValues.length > 50`: set `selectedValues = new Set()` (no restriction — all nodes pass).
 * - Store `allValues` in the StringFilterState for use by StringFilter dropdown.
 *
 * SEMANTIC NOTE — two meanings of "empty selectedValues":
 *   selectedValues.size === 0 always means NO RESTRICTION (all nodes pass).
 *   selectedValues = new Set(allValues) means only nodes whose value is in allValues pass.
 *   Since the ≤50 case pre-selects all known values, both effectively pass all nodes on load.
 *
 * FILTER EVALUATION rule: a node passes a string filter when:
 *   filter is disabled, OR selectedValues.size === 0, OR node's value is in selectedValues.
 *
 * The `propertyMetas` argument provides types so the hook knows which filter
 * variant to initialise without re-running type detection.
 *
 * @example
 * const { filters, matchingNodeIds, clearAllFilters } = useFilterState(graph, propertyMetas)
 */
export function useFilterState(
  graph: Graph | null,
  propertyMetas: PropertyMeta[]
): FilterStateHandle
```

### `hooks/useNodeColors.ts`

```ts
/**
 * Derives a hex color for every node based on:
 * 1. Whether any filters are active (enabled and non-default)
 * 2. Whether the node is in matchingNodeIds
 * 3. Whether a color gradient is active (overrides highlighted color for active nodes)
 * 4. Whether the node is selected (adds ring; handled by Sigma node reducer, not this hook)
 *
 * Color rules:
 * - No filters active → '#94a3b8' (default/neutral)
 * - Passes all filters → '#93c5fd' (highlighted) OR gradient color if gradient active
 * - Fails any filter  → '#e2e8f0' (grayed-out) — gradient never applies
 *
 * Returns a stable Map reference when nothing changed (for React memo stability).
 *
 * @example
 * const nodeColors = useNodeColors(graph, matchingNodeIds, hasActiveFilters, gradientColors)
 */
export function useNodeColors(
  graph: Graph | null,
  matchingNodeIds: Set<string>,
  hasActiveFilters: boolean,
  gradientColors: Map<string, string> | null
): Map<string, string>
```

### `hooks/useColorGradient.ts`

```ts
/**
 * Computes a per-node hex color from a selected property + palette,
 * applied only to active (non-grayed-out) nodes.
 *
 * Number: continuous gradient — `t = (value - min) / (max - min)`, call `interpolatePalette(palette, t)`.
 * Date: same as number — convert ISO string to ms via `new Date(s).getTime()` INSIDE this
 *   hook for normalisation math only. Never write numeric timestamps back to graph attributes.
 *   Stored values remain ISO strings everywhere outside this hook.
 * Boolean: binary — call `getPaletteColors(palette, customColors)`, assign index 0 to false,
 *   last index to true.
 * String: discrete — call `getPaletteColors(palette, customColors)`, assign each distinct value
 *   a color by index, round-robin on overflow.
 * min === max guard (number/date): when all active nodes share the same value,
 *   use `interpolatePalette(palette, 0.5)` for all. Never divide by zero.
 *
 * Returns null when no property is selected.
 * Returns an empty Map (not null) when a property is selected but no active nodes have values.
 *
 * @example
 * const gradientColors = useColorGradient(graph, matchingNodeIds, gradientState)
 */
export function useColorGradient(
  graph: Graph | null,
  matchingNodeIds: Set<string>,
  state: ColorGradientState
): Map<string, string> | null
```

### `hooks/useDebounce.ts`

```ts
/**
 * Returns a debounced version of `fn` that delays invocation until `delay` ms
 * after the last call. Used by all continuous controls in the app.
 *
 * **Debounce ownership rule:** always debounce at the leaf component level.
 * Parent components (`LeftSidebar`, `GraphView`) receive already-debounced values.
 * This applies to: gravity/speed sliders, number filter range, date pickers,
 * string search input, and canvas resize.
 *
 * @param fn - Function to debounce.
 * @param delay - Debounce delay in milliseconds (default 150).
 * @returns Stable debounced function reference (does not change between renders).
 * @example
 * const debouncedSearch = useDebounce((q: string) => setQuery(q), 150)
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay = 150
): T
```

---

## Component Architecture

```
App
├── DropZone                     (before file load)
└── GraphView                    (after file load — owns all state)
    ├── LeftSidebar
    │   └── (buttons, sliders, counts, download button)
    ├── <div ref={sigmaContainer}> (Sigma canvas, fills remaining space)
    │   ├── <canvas>             (Sigma WebGL)
    │   ├── FilenameLabel        (absolute, top-left of canvas)
    │   ├── CanvasControls       (absolute, bottom-right of canvas — +/−/fit)
    │   ├── NodeTooltip          (absolute, anchored to selected node)
    │   └── DragOverlay          (full-canvas dim overlay while file dragged over)
    └── RightSidebar
        └── Tabs (Filters | Stats | Color)
            ├── FiltersTab
            │   └── PropertyFilterPanel × N
            │       └── NumberFilter | StringFilter | DateFilter | BooleanFilter
            ├── StatsTab
            │   └── Histogram
            └── ColorTab
```

**State ownership in `GraphView`:**
- `graphData: GraphData` — raw loaded data
- `graph: Graph` — Graphology instance
- `propertyMetas: PropertyMeta[]` — stable, computed once on load
- `positionMode: PositionMode` — from buildGraph
- `simulationSettings: SimulationSettings`
- `filterHandle: FilterStateHandle` — from useFilterState
- `gradientState: ColorGradientState`
- `tooltipState: TooltipState | null`
- `selectedPropertyForStats: string | null`

---

## Component Specs

### `App.tsx`

```ts
/**
 * Root component. Manages top-level graph load state.
 * Renders DropZone before graph is loaded, GraphView after.
 * Wraps GraphView in a React Error Boundary.
 */
```

State:
- `loadedData: { data: GraphData; graph: Graph; positionMode: PositionMode; filename: string } | null`

Flow:
1. Render `<DropZone onLoad={handleLoad} />` while `loadedData === null`.
2. `handleLoad(data, graph, positionMode, filename)` sets state → renders `<GraphView>`.
3. `<GraphView onLoadNewFile={() => setLoadedData(null)} />` resets to DropZone when user loads a new file.

**`buildGraph` is called exactly once per load, inside `DropZone`.**
`GraphView` receives the already-built `Graph` instance as a prop — it never calls `buildGraph` itself.
This avoids building the graph twice at 50k nodes.

### `DropZone.tsx`

```ts
/**
 * Full-screen file drop target for initial graph load.
 * Accepts .json via drag-and-drop or click-to-browse.
 * Runs the full data pipeline on drop — including buildGraph.
 * GraphView never calls buildGraph; it receives the built graph as a prop.
 */
interface Props {
  onLoad: (data: GraphData, graph: Graph, positionMode: PositionMode, filename: string) => void
}
```

Behavior:
- Drag enter/over: highlight border.
- Drop: run `parseJSON → validateGraph → applyNullDefaults → buildGraph` pipeline in full.
- If `replacementCount > 0`: show `<NullDefaultModal>` (shadcn `AlertDialog` — not `Dialog`,
  so the user cannot dismiss via Escape or click-outside; must choose explicitly) before calling `onLoad`.
  - On "Cancel": discard the in-memory graph and data; do nothing.
  - On "Load anyway" (primary action): call `onLoad(data, graph, positionMode, filename)`.
- If `replacementCount === 0`: call `onLoad` directly without modal.
- On any pipeline error: display inline error message; drop zone stays active immediately.
- Shows spinner from file drop until `onLoad` is called (covers full pipeline).

### `GraphView.tsx`

```ts
/**
 * Main view after graph is loaded. Owns the Sigma instance, simulation,
 * filter state, color gradient, and tooltip state.
 * Receives the pre-built Graphology graph from App (built once in DropZone).
 * Calls sigma.kill() on unmount.
 */
interface Props {
  graphData: GraphData
  graph: Graph               // pre-built by DropZone, never rebuilt here
  positionMode: PositionMode
  filename: string
  onLoadNewFile: () => void
}
```

**Sigma initialisation** (inside `useEffect`, runs once on mount):
```ts
const sigma = new Sigma(graph, containerRef.current!, {
  renderEdgeLabels: false,
  defaultNodeColor: '#94a3b8',
  defaultEdgeColor: '#94a3b8',
  labelRenderedSizeThreshold: 8,    // hides labels until node reaches 8px visual radius
  // NOTE: Sigma v3 `labelRenderedSizeThreshold` is a hard cutoff, not a smooth fade.
  // The spec calls for a ~150ms CSS opacity transition. Verify at implementation time:
  // if Sigma v3 does not support opacity interpolation natively, add a custom label
  // renderer that interpolates opacity as zoom crosses the threshold.
  labelFont: 'system-ui, sans-serif',
  labelSize: 12,
  // Selected-node ring: override color + highlight for the node whose tooltip is open.
  // `highlighted: true` tells Sigma to draw the node with a border/ring.
  nodeReducer: (node, attrs) => {
    if (node === tooltipStateRef.current?.nodeId) {
      return { ...attrs, color: '#3b82f6', highlighted: true }
    }
    return attrs
  },
})
```

`tooltipStateRef` is a `useRef<TooltipState | null>` kept in sync with the `tooltipState`
React state. Add this effect immediately after the Sigma init effect:
```ts
useEffect(() => {
  tooltipStateRef.current = tooltipState
}, [tooltipState])
```
The `nodeReducer` runs every render frame — reading from a ref avoids
stale closure issues without re-creating Sigma on tooltip changes.

**Partial-position warning** — rendered below the canvas when `positionMode === 'partial'`:
```tsx
{positionMode === 'partial' && (
  <div className="mx-3 mt-2 rounded px-3 py-2 text-[13px] bg-yellow-50 border border-yellow-300 text-yellow-900">
    Some nodes have positions and some do not — positions ignored.
    Run the simulation to generate a layout.
  </div>
)}
```
Non-blocking inline message. Not dismissible — persists until the user loads a new file.

**Node color + size sync** — called whenever `nodeColors` map changes:
```ts
graph.updateEachNodeAttributes((node, attrs) => ({
  ...attrs,
  color: nodeColors.get(node) ?? '#94a3b8',
  size: matchingNodeIds.has(node) && hasActiveFilters ? 5 * 1.15 : 5,
}))
```

**Edge color + size sync** — called in the same effect, immediately after node sync:
```ts
graph.updateEachEdgeAttributes((edge, attrs, source, target) => {
  const isGrayed =
    hasActiveFilters &&
    (!matchingNodeIds.has(source) || !matchingNodeIds.has(target))
  return {
    ...attrs,
    color: isGrayed ? '#e2e8f0' : '#94a3b8',
    size:  isGrayed ? 0.5 : 1,
  }
})
sigma.refresh()
```
Never remount Sigma on filter or color changes.

**Node click handler** (grayed-out nodes are ignored; cursor shows `default` on hover):
```ts
sigma.on('clickNode', ({ node }) => {
  if (hasActiveFilters && !matchingNodeIds.has(node)) return  // grayed-out: ignore
  const { x, y } = sigma.graphToViewport(graph.getNodeAttributes(node))
  setTooltipState({ nodeId: node, x, y })
})
sigma.on('enterNode', ({ node }) => {
  const isGrayed = hasActiveFilters && !matchingNodeIds.has(node)
  sigma.getContainer().style.cursor = isGrayed ? 'default' : 'pointer'
})
sigma.on('leaveNode', () => {
  sigma.getContainer().style.cursor = 'default'
})
```

**Canvas resize** (debounced, cleaned up on unmount):
```ts
const handleResize = useDebounce(() => sigma.resize(), 100)
window.addEventListener('resize', handleResize)
// in useEffect cleanup:
return () => window.removeEventListener('resize', handleResize)
```

**File drag-over on window**: show `<DragOverlay>`, on drop trigger confirmation dialog flow. When simulation is running, stop it first, then show dialog.

**Confirmation dialog** before loading new file:
- "Loading a new file will clear the current graph. Continue?"
- Cancel: keep current state.
- Confirm: call `onLoadNewFile()` → App resets to DropZone → user drops new file.

**Sequence when simulation is running** (DoD item 6 — order matters):
1. Receive drop event → show `<DragOverlay>`.
2. If simulation is running: call `stop()` and wait for the `'stop'` worker event.
3. Only after worker confirms stop: show the confirmation `AlertDialog`.
4. Cancel: call `start()` to resume; hide `<DragOverlay>`.
5. Confirm: call `onLoadNewFile()`.

### `LeftSidebar.tsx`

Purely presentational (no local state). Width: 240px, background `#ffffff`.

Sections (top to bottom, 16px gaps between sections):
1. **"Load new file"** — ghost button, triggers parent confirmation dialog.
2. **SIMULATION** (section header — 11px, semibold, uppercase, muted).
3. Run + Stop buttons side by side. Inactive button: `opacity-50 pointer-events-none`.
4. "Simulating…" indicator with `animate-pulse` filled dot — visible only while running.
5. `simulationError` message — rendered below Run/Stop row, 12px, red/muted text, only when non-null.
   Text: *"Simulation failed — reload file to continue."* Run button remains enabled.
6. Gravity slider (log scale; display current value below).
7. Speed slider (log scale; display current value below).
8. "↺ Randomize Layout" button.
9. **GRAPH INFO** (section header).
10. Nodes: N / Edges: N (tabular numerals).
11. **"↓ Download Graph"** — ghost button.

**Debounce ownership:** All debouncing happens at the leaf component level (the slider component
itself calls `onChange` only after 150ms of inactivity). `LeftSidebar` and `GraphView` receive
already-debounced values. This applies to all sliders throughout the app — gravity, speed, number
filter range, date pickers, and string search inputs all debounce internally.

```ts
interface Props {
  isRunning: boolean
  simulationError: string | null   // null when no error; shown below Run/Stop buttons
  gravity: number
  speed: number
  nodeCount: number
  edgeCount: number
  onRun: () => void
  onStop: () => void
  onGravityChange: (v: number) => void
  onSpeedChange: (v: number) => void
  onRandomizeLayout: () => void
  onLoadNewFile: () => void
  onDownloadGraph: () => void
}
```

### `RightSidebar.tsx`

Container for the three tabs. Width: 300px, background `#ffffff`. Uses shadcn/ui `Tabs`.

```ts
interface Props {
  propertyMetas: PropertyMeta[]
  filterHandle: FilterStateHandle
  graph: Graph | null
  gradientState: ColorGradientState
  isGradientActive: boolean        // true when gradientState.propertyKey is non-null
  onGradientChange: (s: ColorGradientState) => void
  selectedStatsProperty: string | null
  onStatsPropertyChange: (key: string | null) => void
}
```

When `isGradientActive === true`, the **"Color"** tab label shows a small indicator dot
(a filled circle, `#3b82f6`, ~6px) to signal that a gradient is currently applied.
Implemented by wrapping the tab trigger label:
```tsx
<TabsTrigger value="color">
  Color {isGradientActive && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />}
</TabsTrigger>
```

### `FiltersTab.tsx`

```ts
/**
 * Filters tab content. Shows filter panels for all properties.
 * At 10+ properties, the tab scrolls independently (overflow-y: auto).
 */
```

Layout (top, pinned — not scrolled):
1. `"N nodes match"` with `aria-live="polite"`.
2. `"Filters combine with AND — nodes must match all enabled filters."` — muted note immediately
   below count. Styling: `text-[12px] text-slate-400 italic my-1`.
3. "Clear all filters" button (always visible when any filter is enabled).
4. Zero-match banner — shown inline below the Clear button when `matchCount === 0` and `hasActiveFilters`:
   ```tsx
   <div className="rounded px-3 py-2 text-sm bg-amber-50 border border-amber-200 text-amber-900">
     <p>No nodes match the current filters.</p>
     <button onClick={clearAllFilters} className="underline mt-1">Clear all filters</button>
   </div>
   ```
   The pinned "Clear all filters" button (row 3) **remains visible** alongside the banner —
   the banner button is an additional affordance. Both call `clearAllFilters`.

This order matches the spec's textual description: the AND note is pinned immediately below the
count so it remains visible without scrolling. The Clear button sits between the AND note and the
filter list. The zero-match banner appears after all pinned controls.

Then scrollable list of `<PropertyFilterPanel>` sorted alphabetically by key.

If no properties: `"No properties."` (italic, muted).

### `PropertyFilterPanel.tsx`

```ts
/**
 * One collapsible panel per property in the Filters tab.
 * Header: chevron ▾/▶ | enable checkbox | property name (truncated) | type badge
 * Body: the appropriate filter control for the property type
 */
interface Props {
  meta: PropertyMeta
  filterState: FilterState
  onFilterChange: (state: FilterState) => void
}
```

Behavior:
- Chevron toggles collapse. Click target: chevron only (not the full header row).
- Checkbox remains interactive in collapsed state.
- Disabled state: filter controls at 50% opacity, `pointer-events: none`.
- Type badge: 11px, rounded, slate-100 background, lowercase text.
- Long property names: `truncate` class + `title` attribute for browser tooltip.
- Initial state: expanded.

### `filters/NumberFilter.tsx`

Dual-handle range slider using shadcn/ui `Slider` with `min`, `max`, and `value=[low, high]`. Displays current low and high below the track.

```ts
interface Props {
  state: NumberFilterState
  onChange: (min: number, max: number) => void
}
```

- Debounce: 150ms (handled in this component via `useDebounce`).
- Display: use `toFixed(2)` for `|value| >= 0.01`; use `toPrecision(3)` for smaller values to
  avoid rounding e.g. `0.001` to `0.00`. Raw (unrounded) number used for filter comparison.

### `filters/StringFilter.tsx`

```ts
interface Props {
  state: StringFilterState
  onChange: (values: Set<string>) => void
}
```

UI:
- Selected values render as removable tags above the search input.
- Search input: **case-insensitive** prefix matching against `state.allValues`, debounced 150ms.
- Dropdown: up to 10 matching values, selected ones show ✓.
  Keyboard navigation: Up/Down arrows move focus between options; Enter selects/deselects;
  Escape closes the dropdown.
- Tag overflow: when tags exceed 2 rows, show `+N more` chip; clicking it expands the tag area
  inline (no animation — wrapping flex container shows all tags + "Show less" link at the end).
- Empty tags (`selectedValues.size === 0`): show hint `"All values included."` All nodes pass.
- Default (≤50 unique values): all values pre-selected. Shows "Clear all" link.
- Default (>50 unique values): no restriction. Placeholder: `"Search to filter by specific values."`
- Empty string display: show as `""` (literal double-quote notation, monospace font).

### `filters/DateFilter.tsx`

```ts
interface Props {
  state: DateFilterState
  onChange: (after: string | null, before: string | null) => void
}
```

UI:
- Two `<input type="date">` wrapped in shadcn `Popover` for consistent cross-browser styling.
- Labels: "After" (inclusive) / "Before" (inclusive). Placeholder: "Any date."
- Inline validation error below fields when `after > before`: `"After date must be earlier than Before date."`
  - Zero nodes pass until corrected.
- Debounce: 150ms.

### `filters/BooleanFilter.tsx`

```ts
interface Props {
  state: BooleanFilterState
  onChange: (selected: BooleanFilterState['selected']) => void
}
```

UI: shadcn `RadioGroup` with three options: **true** | **false** | **either**.
Arrow keys cycle states.

### `NodeTooltip.tsx`

```ts
/**
 * Floating tooltip anchored to the selected node's viewport position.
 * Positioned absolutely relative to the Sigma canvas container.
 * Flips horizontally and/or vertically to stay within canvas bounds.
 */
interface Props {
  nodeId: string
  screenPosition: { x: number; y: number }
  graphData: GraphData
  propertyMetas: PropertyMeta[]
  /** Keys replaced with type defaults for this node.
   *  Resolved in GraphView: `graph.getNodeAttribute(nodeId, '_defaultedProperties') ?? []`
   *  and passed down. NodeTooltip must not access the graph directly. */
  defaultedProperties: string[]
  canvasBounds: DOMRect
  onClose: () => void
}
```

Behavior:
- Opens focused (`autoFocus` on the tooltip `div` or close button).
- Close on: × button, Escape key, click outside tooltip.
- On close: `focus()` canvas container.
- Content: `label` as heading (fallback to `id`). Properties in alphabetical order.
- Number: `toFixed(2)` display (single line).
- String: shown as-is (single line).
- Boolean: `true` / `false` (single line).
- Date: **two lines** — Line 1: `"2021-03-15 · 1,423 days ago"`, Line 2: raw ISO string (11px, muted).
  Days computed as `Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)`.
  **Exception:** if the property key is in the `defaultedProperties` prop, suppress
  the "· N days ago" annotation and show only the raw ISO string (single line, no elapsed time).
  This prevents defaulted `"1970-01-01"` values from displaying a misleading "~20,278 days ago".
- Property name truncation + `title` attribute.

**Accessibility:**
- Tooltip `div` must have `role="dialog"`, `aria-label="Node details"`, `aria-modal="false"`.
- Close button must have `aria-label="Close"`.
- Click-outside detection: `useEffect` attaches `mousedown` on `document`; if the event target
  is outside the tooltip ref, call `onClose()`. Remove listener on cleanup.

> **⚠ DoD item 31 note:** DoD item 31 says *"raw values as smaller secondary lines beneath each row"*
> for all property types. This is misleading wording. The spec body is unambiguous: **only date
> properties show a raw second line in v1.** Numbers, strings, and booleans use a single formatted
> line. Dual-line display for other types is explicitly post-MVP. Do not implement dual-line for
> non-date properties.

### `StatsTab.tsx`

```ts
/**
 * Stats tab content: total/filtered node counts + number property analysis.
 */
interface Props {
  totalNodes: number
  filteredNodes: number
  numberProperties: string[]       // keys of number-type properties
  selectedProperty: string | null
  graph: Graph | null
  matchingNodeIds: Set<string>
  hasActiveFilters: boolean
  onPropertyChange: (key: string | null) => void
}
```

- Node counts use `aria-live="polite"`.
- Property dropdown hidden if `numberProperties.length === 0`; shows message instead:
  `"No number properties detected. Stats are available for number-type properties only."`
- Stats computed from `computeStats()` over values of `selectedProperty` for `matchingNodeIds`
  (or all nodes when no filters active).
- When `computeStats()` returns `null` (no values for property among filtered nodes),
  display all stat fields as `—` (em-dash).
- `<Histogram>` rendered below stats.

### `Histogram.tsx`

```ts
/**
 * Inline horizontal bar chart for a single numeric property's distribution.
 * No Y-axis labels. Each bar shows hover tooltip with range + count.
 */
interface Props {
  buckets: HistogramBucket[]
}
```

Implementation: `<div>` bars with `position: relative` and absolute-positioned hover tooltips
(simpler than SVG; no resize handling needed; `title` attribute provides accessible fallback).
Bar hover tooltip format: `"10.0 – 20.0: 5 nodes"` — both boundaries shown as inclusive for
readability (the last bucket is truly inclusive; intermediate buckets are exclusive on the right,
but this distinction is not shown in the tooltip label).
Relative bar height: `height: (count / maxCount * 100)%` within a fixed-height container.

### `ColorTab.tsx`

```ts
/**
 * Color tab: property selector + palette selector + gradient legend.
 */
interface Props {
  propertyMetas: PropertyMeta[]
  state: ColorGradientState
  graph: Graph | null
  matchingNodeIds: Set<string>
  onChange: (s: ColorGradientState) => void
}
```

Layout:
1. Property selector (`Select` — all properties + "None" default).
2. Palette selector (`Select` — Viridis, Plasma, Blues, Reds, Rainbow, RdBu) with an additional
   "＋ Add color" item at the bottom of the dropdown. Selecting it reveals a native
   `<input type="color">` element (no extra dependency). The chosen hex is appended to
   `ColorGradientState.customColors`. Custom colors persist for the session (stored in state).
3. Gradient legend (replaces the legend area entirely when an empty state applies):
   - Number/date: horizontal gradient bar with min/max labels.
   - Boolean/string: discrete colored chips with value labels. If more than 8 values,
     chips scroll horizontally within the 300px sidebar.
   - All same value (min === max for number/date): legend area replaced by
     `"All nodes have the same value — uniform color applied."`
4. Empty states (shown in place of the legend):
   - No property selected: `"Select a property to visualise node colors."`
   - Property selected, no active node values: `"No data for selected property."`

### `ErrorBoundary.tsx`

```ts
/**
 * React class Error Boundary wrapping GraphView.
 * Catches synchronous render/mount errors (e.g. WebGL context unavailable).
 * Falls back to a plain error message so the page does not go blank.
 */
```

- Must be a class component (React Error Boundaries require `componentDidCatch`).
- Fallback UI: `"Graph failed to render. Check browser console for details."`
- Log in `componentDidCatch`: `console.error('React boundary caught:', error, errorInfo.componentStack)`
- Does not catch async errors inside `useEffect` — those are handled by `GraphView` directly.

### `DragOverlay.tsx`

```ts
/**
 * Full-canvas semi-transparent overlay shown when a file is dragged over the
 * window while a graph is already loaded.
 */
interface Props {
  isVisible: boolean
}
```

- `position: absolute`, covers the entire Sigma canvas container.
- Background: `rgba(0, 0, 0, 0.4)` — z-index layer 2 (above canvas, below tooltip and modals).
- Centered text: `"Drop to load new graph."` (white, 16px, semibold).
- Rendered always; shown/hidden via `isVisible` prop with a smooth 150ms fade:
  ```tsx
  className={`transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
  ```

### `FilenameLabel.tsx`

```ts
/**
 * Displays the loaded filename in muted text, positioned top-left of the canvas.
 */
interface Props {
  filename: string
}
```

- `position: absolute`, top: 8px, left: 12px.
- Color: `#94a3b8`, font-size: 12px.
- z-index layer 4 (canvas controls group — see Z-index table in spec).

### `CanvasControls.tsx`

```ts
/**
 * On-screen zoom and fit buttons overlaid on the canvas, bottom-right corner.
 */
interface Props {
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}
```

- `position: absolute`, bottom: 12px, right: 12px.
- Three `Button` (shadcn, variant `outline`, size `icon` — 32×32px, icon 16px) stacked vertically: `+` / `−` / `⊡`.
  Hover: `hover:bg-slate-50`. Active: `active:bg-slate-100`. Cursor: `pointer`.
- Handlers in `GraphView`:
  ```ts
  onZoomIn:  () => sigma.getCamera().animatedZoom({ duration: 200 })
  onZoomOut: () => sigma.getCamera().animatedUnzoom({ duration: 200 })
  onFit:     () => sigma.fit()
  ```

---

## Sigma Initialization Reference

```ts
const sigma = new Sigma(graph, container, {
  renderEdgeLabels: false,
  defaultNodeColor: '#94a3b8',
  defaultEdgeColor: '#94a3b8',
  labelRenderedSizeThreshold: 8,
  labelFont: 'system-ui, sans-serif',
  labelSize: 12,
  nodeReducer: (node, attrs) => {
    // Selected node: override with blue-500 + ring.
    // tooltipStateRef.current is a useRef kept in sync with tooltipState.
    if (node === tooltipStateRef.current?.nodeId) {
      return { ...attrs, color: '#3b82f6', highlighted: true }
    }
    return attrs
  },
})
```

The `nodeReducer` is called per-node per-render frame by Sigma — it must be fast (no Map lookups
that iterate). Reading from a `ref` is O(1) and safe inside a render callback.

Edge attributes to set per edge on graph load:
```ts
{ color: '#94a3b8', size: 1 }
```

Node attributes to set per node on graph load:
```ts
{
  color: '#94a3b8',
  size: 5,
  label: node.label ?? node.id,
  _defaultedProperties: [],   // populated by buildGraph from applyNullDefaults result
}
```

---

## Performance Architecture

These constraints are **non-negotiable** for 50k-node graphs.

| Rule | Implementation |
|---|---|
| FA2 on Web Worker | `new FA2Layout(graph, settings)` — never run on UI thread |
| Node recolor without remount | `graph.updateEachNodeAttributes()` + `sigma.refresh()` — no new Sigma instance |
| Label threshold | `labelRenderedSizeThreshold: 8` in Sigma config — labels skipped until zoomed in |
| Filter evaluation is synchronous | Pre-compute numeric values per property on load; iterate nodes once per filter change |
| String filter search | Prefix match against in-memory array — O(distinct values) per keypress, never async |
| Stats recompute | `computeStats()` and `computeHistogram()` over the matched node set — both O(n) |
| Debounce all continuous controls | 150ms debounce on sliders, string search, date pickers |
| Sigma resize | Debounced 100ms via `lodash/debounce` or inline `setTimeout` |
| Gradient color map | Computed once per property/palette/filter change; stored as `Map<nodeId, hex>` |
| No full re-renders | Color/filter changes must not trigger React re-render of Sigma canvas |

---

## UI Design Tokens

```ts
// Node colors
const NODE_DEFAULT     = '#94a3b8'  // slate-400 — no filters active
const NODE_HIGHLIGHTED = '#93c5fd'  // blue-300  — passes all filters
const NODE_GRAYED      = '#e2e8f0'  // slate-200 — fails any filter
const NODE_SELECTED    = '#3b82f6'  // blue-500  — tooltip open, 2px ring

// Edge colors
const EDGE_DEFAULT     = '#94a3b8'
const EDGE_GRAYED      = '#e2e8f0'

// Node sizes
const NODE_SIZE_DEFAULT     = 5
const NODE_SIZE_HIGHLIGHTED = 5 * 1.15  // ≈ 5.75

// Edge sizes
const EDGE_SIZE_DEFAULT = 1
const EDGE_SIZE_GRAYED  = 0.5

// Canvas background
const CANVAS_BG = '#f8fafc'  // slate-50

// Sidebar backgrounds
const SIDEBAR_BG = '#ffffff'

// Z-index layers (use Tailwind z-* or inline style — must not overlap)
const Z_MODALS          = 50  // AlertDialog, confirmation dialogs, null-default modal
const Z_TOOLTIP         = 30  // NodeTooltip
const Z_DRAG_OVERLAY    = 20  // full-canvas drag-and-drop overlay
const Z_CANVAS_CONTROLS = 10  // +/−/fit buttons, FilenameLabel
```

---

## shadcn/ui Component Map

| UI element | shadcn/ui component |
|---|---|
| Run/Stop/Randomize/Download buttons | `Button` |
| Gravity + Speed sliders | `Slider` |
| Number range slider | `Slider` (dual handle via two values) |
| Filter enable/disable | `Checkbox` |
| Boolean toggle | `RadioGroup` |
| Date pickers | `Popover` + native `<input type="date">` |
| String filter multi-select | `Popover` + `Command` |
| Filters / Stats / Color tab switcher | `Tabs` |
| Stats property dropdown | `Select` |
| Color property + palette dropdowns | `Select` |
| Null-default modal, confirmation dialogs | `AlertDialog` (must use AlertDialog — not Dialog — so user cannot dismiss via Escape/click-outside) |
| Large-graph warning | `AlertDialog` |
| Download toast | Custom `<div>` with `setTimeout` auto-dismiss (~2s). No Sonner dependency. |

---

## Testing Strategy

### Unit Tests — Vitest (`src/test/`)

Pure functions in `lib/` only. No React, no Sigma, no canvas.

**`parseJSON.test.ts`**:
- Valid JSON string → returns parsed object
- Invalid JSON → throws "Invalid JSON file"

**`validateGraph.test.ts`**:
- Valid full input → returns typed `GraphData`
- Missing `version` → throws with exact message `"Unsupported schema version"`
- Unknown `version` (e.g. `"2"`) → throws with exact message `"Unsupported schema version"`
- Missing `nodes` array → throws with exact message `"File must contain nodes and edges arrays"`
- Missing `edges` array → throws with exact message `"File must contain nodes and edges arrays"`
- Non-array `nodes` → throws with exact message `"File must contain nodes and edges arrays"`
- 0 nodes after filtering invalid ones → throws `"Graph has no nodes to display"`
- Node missing `id` → node skipped, `console.warn` called, remaining nodes returned
- Edge referencing unknown node → edge skipped, `console.warn` called
- Empty `nodes` + `edges` arrays → valid (0 nodes will throw "Graph has no nodes to display")
- Properties with number/string/boolean values → passes

**`applyNullDefaults.test.ts`**:
- No missing values → `replacementCount === 0`
- Missing number property → replaced with `0`, count incremented
- Missing string property → replaced with `""`
- Missing boolean property → replaced with `false`
- Missing date property → replaced with `"1970-01-01"`
- Mixed missing across multiple nodes → correct total count

**`buildGraph.test.ts`**:
- All nodes have x+y → positionMode === 'all', positions preserved
- Some nodes have x+y → positionMode === 'partial', all positions randomised
- No nodes have x+y → positionMode === 'none', all positions randomised
- Returns correct node/edge counts
- Edge to unknown node skipped with `console.warn`
- Node `label` and `properties` stored as Graphology attributes
- Node with defaulted properties → `_defaultedProperties` attribute contains correct keys
- Node with no defaulted properties → `_defaultedProperties` is an empty array

**`detectPropertyTypes.test.ts`**:
- All boolean values → `'boolean'`
- All number values → `'number'`
- 100% valid ISO 8601 strings → `'date'`
- Any non-ISO string present → `'string'`
- Mixed numbers and strings → `'string'`
- All null/undefined → `'number'` (safe default)

**`computeStats.test.ts`**:
- Correct min/max/mean on known data
- Correct median on odd and even-length arrays
- Correct P25/P75 on known data
- Null/undefined excluded from calculation
- Single-element array → all stats equal
- Empty/all-null array → returns `null`

**`computeHistogram.test.ts`**:
- Returns correct number of buckets (Sturges, clamped [3, 20])
- All values fall into exactly one bucket
- Buckets span [min, max] range
- Empty input → empty array
- Single value → minimum bucket count (3), value falls in first bucket
- All identical values (e.g. `[5, 5, 5, 5]`) → 3 buckets (minimum), all values in first bucket,
  no division-by-zero error (bucket width handles min === max gracefully)

### E2E Tests — Playwright (`e2e/`)

**`drop-zone.spec.ts`**:
- Upload valid file → graph renders, filename shown on canvas
- Upload invalid JSON → inline error displayed, drop zone re-enabled
- Upload file missing `nodes` → error message contains "File must contain nodes and edges arrays"
- Upload empty graph (0 nodes) → error message contains "Graph has no nodes to display"
- Spinner visible from drop until first render frame
- Upload `partial-positions-graph.json` → loads successfully and inline warning
  *"Some nodes have positions and some do not — positions ignored."* is visible on canvas (DoD 41)

**`simulation.spec.ts`**:
- Run button starts simulation (Simulating… indicator appears)
- Stop button stops simulation
- Gravity slider change stops/restarts simulation
- Randomize Layout re-randomizes and fits camera
- Large graph (>10k nodes) → confirmation dialog shown before run with "Run anyway" and "Cancel" buttons; Cancel keeps simulation stopped; Run anyway starts it
- File drop while simulating → simulation stops first (await 'stop' event), then confirmation dialog appears

**`filters.spec.ts`**:
- Right sidebar shows all property keys with type badges after loading
- Number filter slider: moving min handle updates displayed value; nodes outside range go gray
- Boolean filter: selecting "true" grays out "false" nodes
- String filter: selecting value tags filters nodes
- Date filter: setting after/before filters nodes
- Enable/disable checkbox dims controls and disables filtering
- Clear all filters resets all to defaults
- Zero-match banner appears when no nodes match; "Clear all" button in banner works
- Switching between Filters/Stats/Color tabs does not change highlight state
- Grayed-out node: click does not open tooltip; cursor is `default` on hover
- Tooltip auto-closes when its node becomes grayed-out by a filter change; focus returns to canvas
- String filter: Up/Down arrow keys navigate dropdown options; Enter selects; Escape closes
- String filter tag overflow: `+N more` chip appears; clicking it expands inline; "Show less" collapses

**`stats.spec.ts`**:
- Stats tab shows total and filtered node counts
- Selecting number property shows min/max/mean/median/P25/P75
- Histogram appears with correct bar count
- Hovering histogram bar shows bucket range and count tooltip
- Stats update when filter changes

**`color.spec.ts`**:
- Color tab property selector applies gradient to active nodes
- Grayed-out nodes remain `#e2e8f0` regardless of gradient
- Switching tabs does not clear gradient
- Palette change updates node colors
- Legend shows correct type (continuous bar vs discrete chips)

**`export-roundtrip.spec.ts`** (required by DoD #55):
- Load sample graph, run simulation briefly, stop
- Click Download Graph → filename prompt appears pre-filled
- Confirm download → toast "Graph downloaded." appears
- Drop exported file → loads without validation error
- All node positions restored exactly: `Math.abs(exported.x - reloaded.x) < 0.0001` for every node
- All node properties preserved exactly (deep equality check on `properties` objects)

---

## Confirmation Dialog Spec

All dialogs are centred modals with `rgba(0,0,0,0.4)` backdrop.
Button order: **Cancel** (ghost/secondary, left) | **Confirm action** (primary, right).

| Dialog | Trigger | Confirm action |
|---|---|---|
| New file (graph already loaded) | Drop file / "Load new file" button | Full app state reset |
| New file (simulation running) | Drop file while simulating | Stop sim → reset state |
| Null-default modal | `replacementCount > 0` on load | Proceed with defaults applied |
| Large-graph warning | Run pressed, node count > 10,000 | Start simulation — dialog title: "Large graph", body: "This graph has N nodes. The simulation may be slow.", buttons: [Cancel] (ghost) / [Run anyway] (primary) |

---

## Export Implementation Notes

**Download flow:**
1. User clicks "↓ Download Graph".
2. Show filename `<input type="text">` prompt (shadcn `Dialog`), pre-filled with original filename
   (including `.json` extension). Input is auto-selected so the user can type immediately to replace.
   Validation: if input is empty, the Confirm button is disabled. Forbidden characters: `/` and `\`
   (strip or reject silently). If user clears input and confirms is disabled, default filename is not
   used — user must provide a non-empty name.
3. On confirm: serialize graph via Sigma coordinates → JSON string → Blob → `URL.createObjectURL` → `<a download>` click → `URL.revokeObjectURL`.
4. Show toast: `"Graph downloaded."` — custom `<div>` positioned bottom-center of viewport,
   auto-dismissed via `setTimeout(hideToast, 2000)`. No Sonner or external toast library.

**Serialization:**
```ts
const exported: GraphData = {
  version: '1',
  nodes: graphData.nodes.map(n => ({
    ...n,
    x: graph.getNodeAttribute(n.id, 'x'),
    y: graph.getNodeAttribute(n.id, 'y'),
  })),
  edges: graphData.edges,
}
```

---

## JSDoc Rules

Every exported function, hook, and component must have:
- One-sentence description
- `@param` for each parameter
- `@returns` describing return value
- `@throws` if applicable
- `@example` for all `lib/` pure functions

Internal helpers and obvious one-liners: no JSDoc required.

---

## Sample Fixture (`e2e/fixtures/sample-graph.json`)

```json
{
  "version": "1",
  "nodes": [
    { "id": "1", "label": "Alice", "properties": { "age": 34, "score": 91.5, "joined": "2021-03-15", "active": true,  "status": "active"   } },
    { "id": "2", "label": "Bob",   "properties": { "age": 28, "score": 74.0, "joined": "2023-11-02", "active": false, "status": "pending"  } },
    { "id": "3", "label": "Carol", "properties": { "age": 45, "score": 55.2, "joined": "2019-07-20", "active": true,  "status": "active"   } },
    { "id": "4", "label": "Dave",  "properties": { "age": 31, "score": 88.8, "joined": "2022-01-10", "active": false, "status": "inactive" } },
    { "id": "5", "label": "Eve",   "properties": { "age": 27, "score": 62.1, "joined": "2024-05-30", "active": true,  "status": "pending"  } }
  ],
  "edges": [
    { "source": "1", "target": "2" },
    { "source": "2", "target": "3" },
    { "source": "3", "target": "4" },
    { "source": "4", "target": "5" },
    { "source": "5", "target": "1" },
    { "source": "1", "target": "3" }
  ]
}
```

This fixture covers all four property types: number (`age`, `score`), date (`joined`), boolean (`active`), string (`status`).

## Partial-Position Fixture (`e2e/fixtures/partial-positions-graph.json`)

Used by the partial-position E2E test (DoD 41). Nodes 1 and 2 have `x`/`y`; nodes 3–5 do not.
Expected behaviour: positions ignored entirely, inline warning shown.

```json
{
  "version": "1",
  "nodes": [
    { "id": "1", "label": "Alice", "x": 100.0, "y": -50.0,  "properties": { "age": 34 } },
    { "id": "2", "label": "Bob",   "x": -80.0, "y": 120.0,  "properties": { "age": 28 } },
    { "id": "3", "label": "Carol",                           "properties": { "age": 45 } },
    { "id": "4", "label": "Dave",                            "properties": { "age": 31 } },
    { "id": "5", "label": "Eve",                             "properties": { "age": 27 } }
  ],
  "edges": [
    { "source": "1", "target": "2" },
    { "source": "2", "target": "3" }
  ]
}
```

---

## Release Structure

Build order: **R1 Core Viewer → R2 Filter System → R3 Stats + Export → R4 Color**.

| Chunk | Release | Description |
|---|---|---|
| 1 | R1 | Scaffold, file drop, JSON pipeline (parseJSON → validateGraph → applyNullDefaults → buildGraph) |
| 2 | R1 | Sigma renderer, FA2 simulation, LeftSidebar simulation controls, partial-position warning |
| 3 | R1 | NodeTooltip, ErrorBoundary |
| 4 | R1 | CanvasControls, FilenameLabel, DragOverlay, large-graph warning dialog |
| 5 | R2 | All filter controls (Number/String/Date/Boolean), useFilterState, node highlight/gray |
| 6 | R2 | FiltersTab UX: count, AND note, zero-match banner, clear-all |
| 7 | R3 | StatsTab: node counts, number property stats, Histogram |
| 8 | R3 | Download/export, filename prompt, custom toast, export round-trip E2E |
| 9 | R4 | ColorTab: gradient, palette selector, custom color, legend, useColorGradient, useNodeColors |

Each chunk is done when: all unit tests pass (`npm run test`), all relevant E2E tests pass
(`npm run test:e2e`), zero lint errors (`npm run lint`), all exported symbols have JSDoc.

> **TODO before R1 starts:** Map each DoD item from `product_specification.md §Definition of Done`
> to a specific chunk in the table above. Without this mapping, per-chunk QA criteria are undefined.

---

## Responsive Design

**Target viewport:** 14-inch and 16-inch MacBooks (approximately 1440×900 to 1728×1080 logical pixels).
No mobile or touch-only support required.

**Minimum supported width:** 1024px. Below this width, a horizontal scrollbar is acceptable —
sidebars do not collapse or stack. No responsive breakpoints needed.

**Sidebar overflow:** Right sidebar content scrolls vertically at 10+ properties (`overflow-y: auto`).
Neither sidebar changes width at different viewport sizes (left: 240px, right: 300px always).

---

## Definition of Done

Refer to `product_specification.md` §Definition of Done for the full 55-point checklist.

Key gates before each release ships:

| Gate | Command |
|---|---|
| All unit tests pass | `npm run test` |
| All E2E tests pass | `npm run test:e2e` |
| Zero lint errors | `npm run lint` |
| All exports have JSDoc | manual review |
| 50k-node smoke test | manual — load large fixture, verify <2s render |
