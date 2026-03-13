# Graph Visualizer — Product Plan

---

## UI Layout

```
┌─────────────────────────────────────────────────┐
│  [Drop Zone — full screen until graph is loaded] │
└─────────────────────────────────────────────────┘

After file is loaded:

┌──────────────┬──────────────────────┬────────────────────────────┐
│  Left        │                      │  Right Sidebar             │
│  Sidebar     │   Sigma canvas       │                            │
│              │   (fills space)      │  Properties                │
│  [▶ Run /    │                      │  ○ age          (number)   │
│   ⏹ Stop]    │                      │  ● score        (number)   │
│              │                      │  ○ joined       (date)     │
│  Gravity     │                      │                            │
│  [────●────] │                      │  Color scale               │
│              │                      │  [Viridis ▾]               │
│  Speed       │                      │                            │
│  [────●────] │                      │  Filter range              │
│              │                      │  [●────────●]              │
│  [↺ Reset]   │                      │   12.3      88.1           │
│              │                      │                            │
│  Nodes: N    │                      │  ▼ Stats  (collapsible)    │
│  Edges: N    │                      │  Min: 12.3  Max: 99.1      │
│              │                      │  Avg: 54.6  P50: 51.2      │
│              │                      │  P90: 88.1                 │
│              │                      │  [histogram bars]          │
└──────────────┴──────────────────────┴────────────────────────────┘

Node click → floating popover anchored to the clicked node:
┌──────────────────┐
│ Alice            │
│ ────────────     │
│ age     34       │
│ score   91.5     │
│ joined  2021-03-15│
│         (1,423d) │
└──────────────────┘
```

---

## Type Definitions

```ts
export interface NodeDatum {
  id: string
  label?: string
  color?: string
  properties?: Record<string, number | string>
}

export interface EdgeDatum {
  source: string
  target: string
  label?: string
}

export interface GraphData {
  nodes: NodeDatum[]
  edges: EdgeDatum[]
}

export type PropertyType = 'number' | 'date'

export interface PropertyMeta {
  key: string
  type: PropertyType
}

export interface PropertyStats {
  min: number
  max: number
  mean: number
  p25: number
  p50: number
  p75: number
  p90: number
  nullCount: number
}

export interface HistogramBucket {
  from: number   // inclusive
  to: number     // exclusive, except last
  count: number
}

export type ColorScaleId = 'viridis' | 'plasma' | 'diverging-red-blue' | 'sequential-blue'

export interface TooltipState {
  nodeId: string
  x: number  // canvas pixel position
  y: number
}
```

---

## Component & Module Specs

### `App.tsx`

Top-level state: `graphData: GraphData | null`. Renders `<DropZone>` when null, `<GraphView>` once loaded.

### `DropZone.tsx`

Full-screen drop target. Accepts `.json` files via drag-and-drop or click-to-browse. On drop: reads file → `validateGraph()` → calls `onGraphLoaded(data)`. Shows inline error on failure and a format hint at all times.

### `GraphView.tsx`

Receives `GraphData`. Owns the Sigma instance, FA2 simulation state, and property analysis state. Renders the three-column layout: `<LeftSidebar>` | Sigma canvas `div` | `<RightSidebar>`. Listens for Sigma `clickNode` events and sets `tooltipState` to show `<NodeTooltip>`. Calls `sigma.kill()` on unmount.

**Node color updates:** When `nodeColors` from `usePropertyAnalysis` changes, apply without remounting:
```ts
graph.updateEachNodeAttributes((node, attrs) => ({
  ...attrs,
  color: nodeColors.get(node) ?? attrs.color,
}))
sigma.refresh()
```

### `LeftSidebar.tsx`

Purely presentational. Props: `isRunning`, `gravity`, `speed`, `nodeCount`, `edgeCount`, `onToggleSimulation`, `onGravityChange`, `onSpeedChange`, `onReset`. Renders Run/Stop, sliders, Reset, counts.

### `RightSidebar.tsx`

Purely presentational container. Composes `<PropertyList>`, `<ColorScaleSelect>`, `<FilterSlider>`, and `<StatsPanel>`. All state lives in `GraphView` and is passed as props. Hidden/greyed when no graph is loaded.

### `PropertyList.tsx`

Radio list of all detected properties. Each item shows the property key and a type badge (`number` or `date`). Selecting one calls `onPropertySelect(key)`. Selecting the already-active property deselects it (sets to null).

### `ColorScaleSelect.tsx`

Dropdown (`<select>`) with the four color scale options. Each option includes a small inline gradient preview rendered as a CSS linear-gradient on a `<span>`. Only active when a property is selected.

### `FilterSlider.tsx`

Dual-handle range slider for filtering by value. Both handles are independently draggable. Displays current min and max values below the track, formatted appropriately (raw number with 2dp, or human-readable elapsed time for date properties e.g. `"1,423 days"`). Only rendered when a property is selected.

Implementation: two overlapping `<input type="range">` elements — no external slider library needed. Ensure the min handle cannot exceed the max handle and vice versa.

### `StatsPanel.tsx`

Collapsible section (default: expanded). Shows a stats grid and embeds `<Histogram>`. Only rendered when a property is selected.

Stats to display:
- Min, Max, Mean
- P25, P50 (median), P75, P90
- Number of nodes with missing values for this property (if > 0)

For date properties, display values as `"N days ago"` rather than raw milliseconds.

### `Histogram.tsx`

Simple bar chart of `HistogramBucket[]` using plain `<div>` elements sized with Tailwind (no charting library). Each bar is proportionally tall relative to the max bucket count. X-axis shows the `from` value of the first and last bucket. Hovering a bar shows a tooltip with exact range and count.

### `NodeTooltip.tsx`

Floating popover anchored to a clicked node's canvas position. Positioned absolutely relative to the Sigma canvas container. Displays the node's `label` as a title, then a table of all property key/value pairs. For date properties, shows both the raw date string and the elapsed duration (e.g. `"2021-03-15 · 1,423 days ago"`). Clicking outside or pressing Escape closes it. Automatically repositions to stay within canvas bounds.

---

## Library Functions

### `lib/detectPropertyType.ts`

```ts
/**
 * Infers the type of a property by sampling its values across all nodes.
 * A property is considered 'date' if the majority of non-null values are
 * valid ISO 8601 date strings. Otherwise it is 'number'.
 */
export function detectPropertyType(values: Array<number | string | null | undefined>): PropertyType
```

### `lib/colorScales.ts`

```ts
/**
 * Maps a normalised value in [0, 1] to a hex color string using the
 * specified color scale.
 */
export function interpolateColor(t: number, scale: ColorScaleId): string
```

Available scales:
- `viridis` — perceptually uniform, dark purple → yellow (colorblind-safe)
- `plasma` — perceptually uniform, dark blue → bright yellow
- `diverging-red-blue` — red → white → blue, centered at midpoint
- `sequential-blue` — light blue → dark blue

### `lib/computeStats.ts`

```ts
/**
 * Computes descriptive statistics for an array of numeric values.
 * Null/undefined values are excluded from all calculations but counted separately.
 */
export function computeStats(values: Array<number | null>): PropertyStats
```

### `lib/computeHistogram.ts`

```ts
/**
 * Divides a set of values into evenly-spaced buckets for histogram display.
 * Automatically chooses a sensible number of buckets (target: ~10, min: 2, max: 20)
 * using Sturges' formula capped at 20.
 */
export function computeHistogram(values: number[], bucketCount?: number): HistogramBucket[]
```

---

## Hooks

### `hooks/useFA2Simulation.ts`

```ts
/**
 * Manages a ForceAtlas2 Web Worker simulation for a Graphology graph.
 * Kills the worker automatically when the component unmounts.
 *
 * @returns { isRunning, start, stop, reset }
 *   - reset() re-randomizes all node positions then restarts.
 */
export function useFA2Simulation(graph: Graph, settings: SimulationSettings)
```

### `hooks/usePropertyAnalysis.ts`

```ts
/**
 * Derives per-node numeric values, statistics, histogram buckets, and node
 * colors for a selected property. Handles date→elapsed-ms conversion automatically.
 *
 * @returns {
 *   properties: PropertyMeta[]
 *   numericValues: Map<string, number | null>
 *   stats: PropertyStats | null
 *   histogram: HistogramBucket[]
 *   nodeColors: Map<string, string>
 * }
 *
 * Color assignment rules:
 * - No property selected → use node's own `color` field or default indigo
 * - Property selected, value in filter range → interpolated color from scale
 * - Property selected, value outside filter range → #e2e8f0 (light gray)
 * - Property selected, value is null → #e2e8f0 (light gray)
 */
export function usePropertyAnalysis(
  graphData: GraphData,
  selectedProperty: string | null,
  colorScale: ColorScaleId,
  filterRange: [number, number]
)
```

---

## Color Scale Behavior

- When no property is selected: nodes use their own `color` field (or default indigo `#6366f1`).
- When a property is selected:
  1. Collect all non-null numeric values for the property across all nodes.
  2. Normalize each value: `t = (value - min) / (max - min)`. If all values are equal, `t = 0.5` for all.
  3. Map `t` through `interpolateColor(t, activeScale)` to get a hex color.
  4. Nodes outside the filter range → `#e2e8f0` (light gray, Tailwind `slate-200`).
  5. Nodes with null for this property → `#e2e8f0`.
- Changing the color scale or moving the filter slider must update node colors immediately without restarting the simulation or remounting Sigma.

---

## Date Property Handling

When a property's type is detected as `'date'`:
- Parse each value with `new Date(value).getTime()`.
- The numeric value used for all analysis (stats, coloring, filtering) is `Date.now() - parsedTimestamp` (milliseconds elapsed until now).
- Larger values = older dates.
- In the `FilterSlider` and `StatsPanel`, display values as `"N days"` by dividing by `86_400_000`.
- In `NodeTooltip`, show both the original date string and `"N days ago"`.

---

## Testing

### Unit Tests — Vitest (`src/test/`)

Only test **pure functions**. Do not test Sigma, the canvas, or React components.

**`validateGraph.test.ts`**:
- Valid input returns typed `GraphData`
- Missing `nodes` or `edges` key throws descriptively
- Non-array `nodes` throws
- Node missing `id` throws
- `properties` with valid number and date string values passes validation
- Empty arrays are valid

**`buildGraph.test.ts`**:
- Returns correct node/edge counts
- Every node has `x` and `y` set
- Edge to unknown node is skipped with `console.warn`
- `color` and `label` passed through
- `properties` passed through as node attributes

**`detectPropertyType.test.ts`**:
- Array of ISO date strings → `'date'`
- Array of numbers → `'number'`
- Mixed array majority-wins
- Array of nulls → `'number'` (safe default)

**`computeStats.test.ts`**:
- Correct min, max, mean on known data
- Correct p50 (median) on odd and even-length arrays
- Null values excluded from stats, counted in `nullCount`
- Single-element array returns equal min/max/mean/percentiles

**`computeHistogram.test.ts`**:
- Returns correct number of buckets
- All values fall into exactly one bucket
- Buckets span the full [min, max] range
- Empty input returns empty array

**`colorScales.test.ts`**:
- `interpolateColor(0, scale)` and `interpolateColor(1, scale)` return valid hex strings for all scales
- `interpolateColor(0.5, 'diverging-red-blue')` returns a near-white color
- Output is always a valid 7-character hex string

### E2E Tests — Playwright (`e2e/`)

**`drop-zone.spec.ts`**: Upload valid/invalid files, check errors.

**`simulation.spec.ts`**: Run/stop/sliders/reset interactions.

**`property-analysis.spec.ts`**:
- After loading the fixture, the right sidebar shows all property keys
- Each property has a type badge (`number` or `date`)
- Clicking a property radio button selects it
- After selection, the color scale dropdown is visible
- After selection, the filter slider is visible
- After selection, the stats panel is visible and expanded by default
- Stats panel shows min, max, and mean values
- Stats panel contains histogram bars
- Clicking the stats panel header collapses it; clicking again expands it
- Moving the filter slider min handle updates the displayed min value
- Clicking a node opens the tooltip popover
- The tooltip shows the node label and all property keys
- Clicking outside the tooltip closes it
- Pressing Escape closes the tooltip
- Selecting a different color scale from the dropdown does not crash the app
- Deselecting a property (clicking the active radio again) hides the stats panel and filter slider

---

## Sample Test Graph

Save as `e2e/fixtures/sample-graph.json`:

```json
{
  "nodes": [
    {
      "id": "1", "label": "Alice",
      "properties": { "age": 34, "score": 91.5, "joined": "2021-03-15" }
    },
    {
      "id": "2", "label": "Bob",
      "properties": { "age": 28, "score": 74.0, "joined": "2023-11-02" }
    },
    {
      "id": "3", "label": "Carol",
      "properties": { "age": 45, "score": 55.2, "joined": "2019-07-20" }
    },
    {
      "id": "4", "label": "Dave",
      "properties": { "age": 31, "score": 88.8, "joined": "2022-01-10" }
    },
    {
      "id": "5", "label": "Eve",
      "properties": { "age": 27, "score": 62.1, "joined": "2024-05-30" }
    }
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

---

## Definition of Done

1. `npm run dev` starts on `http://localhost:5173` with hot reload
2. Dropping a valid JSON file renders the graph
3. Node labels appear when zoomed in
4. Run/Stop controls the ForceAtlas2 simulation
5. Gravity and Speed sliders affect simulation in real time
6. Reset re-randomizes positions and restarts
7. Right sidebar lists all node properties with correct type badges
8. Selecting a property color-codes all nodes using the active scale
9. Changing the color scale immediately repaints nodes
10. The filter slider grays out out-of-range nodes in real time as handles move
11. The stats panel shows correct min, max, mean, and percentiles
12. The histogram renders with sensible bucket widths
13. Clicking a node shows a floating tooltip with all properties
14. Date properties show elapsed-days in tooltip and stats
15. Clicking outside / pressing Escape closes the tooltip
16. Invalid files show a readable error
17. App does not crash or freeze on 50,000 nodes
18. `npm run test` green
19. `npm run test:e2e` green
20. `npm run lint` exits with zero errors
21. All exported symbols have JSDoc
22. `README.md` contains all required sections

### README.md — Required Sections

```markdown
# Graph Visualizer

## Overview
## Prerequisites
## Getting Started
## Input Format (with copy-pasteable example including properties)
## Running Tests
## Project Structure (annotated file tree)
## Architecture Notes
  - Why Sigma.js + Graphology
  - Why ForceAtlas2 runs in a Web Worker
  - Why pure functions for validation/stats/coloring (testability)
  - How color updates avoid remounting Sigma (graph.updateEachNodeAttributes + sigma.refresh)
## Known Limitations
  - Canvas may drop below 60fps at very high edge counts
  - No mobile/touch support
  - Date detection is heuristic — ambiguous values default to 'number'
```
