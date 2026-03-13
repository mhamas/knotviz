# Graph Visualizer — Implementation Plan

---

## UI Design System

Use **shadcn/ui** as the component library throughout the app.

- Built on **Radix UI** primitives (accessible, unstyled, battle-tested)
- Styled with **Tailwind CSS** — consistent with the existing stack
- Excellent documentation: https://ui.shadcn.com
- Not a dependency in the traditional sense — components are copied into `src/components/ui/` and owned by the project, so there's no black-box library to fight
- Widely adopted, stable, no experimental risk

### Installation

```bash
npx shadcn@latest init
npx shadcn@latest add button slider checkbox tabs select popover
```

### Which shadcn/ui components to use

| UI element | shadcn/ui component |
|---|---|
| Run/Stop, Reset, zoom buttons | `Button` |
| Gravity, Speed sliders | `Slider` |
| Filter enable/disable | `Checkbox` |
| Number range slider | `Slider` (dual-handle) |
| Boolean toggle | `RadioGroup` |
| Date pickers | `Popover` + native `<input type="date">` |
| String multi-select search | `Popover` + `Command` (built-in search + list) |
| Filters / Data tab switcher | `Tabs` |
| Property analysis dropdown | `Select` |
| Node tooltip | `Popover` (manually positioned) |
| Expanded histogram modal | `Dialog` (non-MVP) |

---

## Type Definitions

```ts
export interface NodeDatum {
  id: string
  label?: string
  properties?: Record<string, number | string>
}

export interface EdgeDatum {
  source: string
  target: string
  label?: string
}

export interface GraphData {
  version: string
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

export interface TooltipState {
  nodeId: string
  x: number  // canvas pixel position
  y: number
}
```

---

## Component Specs

### `App.tsx`

Top-level state: `graphData: GraphData | null`. Renders `<DropZone>` when null, `<GraphView>` once loaded.

### `DropZone.tsx`

Full-screen drop target. Accepts `.json` files via drag-and-drop or click-to-browse. On drop: reads file → `validateGraph()` → calls `onGraphLoaded(data)`. Shows inline error on failure and a format hint at all times.

### `GraphView.tsx`

Receives `GraphData`. Owns the Sigma instance, FA2 simulation state, and filter state (`filterRanges: Map<string, [number, number]>`). Renders the three-column layout: `<LeftSidebar>` | Sigma canvas `div` | `<RightSidebar>`. Listens for Sigma `clickNode` events and sets `tooltipState` to show `<NodeTooltip>`. Calls `sigma.kill()` on unmount.

**Node color updates** — when `nodeColors` from `usePropertyAnalysis` changes, apply without remounting:
```ts
graph.updateEachNodeAttributes((node, attrs) => ({
  ...attrs,
  color: nodeColors.get(node) ?? '#93c5fd',
}))
sigma.refresh()
```

### `LeftSidebar.tsx`

Purely presentational. Props: `isRunning`, `gravity`, `speed`, `nodeCount`, `edgeCount`, `onToggleSimulation`, `onGravityChange`, `onSpeedChange`, `onReset`. Renders Run/Stop toggle, Gravity slider, Speed slider, Reset button, node/edge counts.

### `RightSidebar.tsx`

Purely presentational container. Renders a scrollable list of `<PropertyFilterPanel>` — one per detected property. All filter state lives in `GraphView` and is passed as props.

### `PropertyFilterPanel.tsx`

One panel per property. Shows the property key and a type badge (`number` or `date`), followed by a `<FilterSlider>` for the property's value range. Props: `meta: PropertyMeta`, `filterRange: [number, number]`, `stats: PropertyStats`, `onFilterChange: (range: [number, number]) => void`.

### `FilterSlider.tsx`

Dual-handle range slider. Both handles independently draggable. Displays current min and max values below the track — raw number with 2dp for number properties, `"N days"` for date properties. Initialised to the full `[stats.min, stats.max]` range.

Implementation: two overlapping `<input type="range">` elements. Ensure the min handle cannot exceed the max handle and vice versa.

### `NodeTooltip.tsx`

Floating popover anchored to a clicked node's canvas position. Positioned absolutely relative to the Sigma canvas container. Shows the node's `label` as title, then a table of all property key/value pairs. Date properties show the original date string and elapsed duration (e.g. `"2021-03-15 · 1,423 days ago"`). Closes on outside click or Escape. Clamps position to stay within canvas bounds.

---

## Library Functions

### `lib/validateGraph.ts`

```ts
/**
 * Validates a raw JSON object against the graph schema and returns typed GraphData.
 *
 * @throws {Error} With a human-readable message describing the first schema violation.
 *
 * @example
 * const data = validateGraph(JSON.parse(fileText))
 */
export function validateGraph(raw: unknown): GraphData
```

Schema stored in `src/lib/graphSchema.json`. Checks: `version` present and known, `nodes`/`edges` are arrays, each node has a string `id`, each edge has string `source`/`target`, `properties` values are numbers or strings only.

### `lib/buildGraph.ts`

```ts
/**
 * Constructs a Graphology graph from validated GraphData, assigning random
 * initial positions to all nodes.
 *
 * @example
 * const graph = buildGraph(data)
 */
export function buildGraph(data: GraphData): Graph
```

### `lib/detectPropertyType.ts`

```ts
/**
 * Infers the type of a property by sampling its values across all nodes.
 * A property is 'date' if the majority of non-null values are valid ISO 8601
 * date strings. Otherwise 'number'.
 *
 * @example
 * detectPropertyType(['2021-03-15', '2023-11-02']) // → 'date'
 */
export function detectPropertyType(values: Array<number | string | null | undefined>): PropertyType
```

### `lib/computeStats.ts`

```ts
/**
 * Computes descriptive statistics for an array of numeric values.
 * Null/undefined values are excluded from calculations but counted separately.
 *
 * @example
 * computeStats([1, 2, 3, null]) // → { min: 1, max: 3, mean: 2, ..., nullCount: 1 }
 */
export function computeStats(values: Array<number | null>): PropertyStats
```

### `lib/computeHistogram.ts`

```ts
/**
 * Divides a set of values into evenly-spaced buckets.
 * Bucket count chosen via Sturges' formula, capped at 20 (min: 2).
 *
 * @example
 * computeHistogram([1, 2, 3, 4, 5])
 */
export function computeHistogram(values: number[], bucketCount?: number): HistogramBucket[]
```

---

## Hooks

### `hooks/useFA2Simulation.ts`

```ts
/**
 * Manages a ForceAtlas2 Web Worker simulation for a Graphology graph.
 * Kills the worker automatically on unmount.
 *
 * @returns { isRunning, start, stop, reset }
 *   - reset() re-randomizes all node positions then restarts.
 */
export function useFA2Simulation(graph: Graph, settings: SimulationSettings)
```

FA2 worker import: `import FA2Layout from 'graphology-layout-forceatlas2/worker'`

Slider changes while running: `stop()` → update settings → `start()`.
Reset: `stop()` → randomize all node positions → `start()`.

### `hooks/usePropertyAnalysis.ts`

```ts
/**
 * Derives per-property stats, per-node numeric values, and per-node highlight
 * colors based on active filter ranges. Handles date→elapsed-ms conversion.
 *
 * @returns {
 *   properties: PropertyMeta[]
 *   numericValues: Map<string, Map<string, number | null>>  // propertyKey → nodeId → value
 *   stats: Map<string, PropertyStats>                       // propertyKey → stats
 *   nodeColors: Map<string, string>                         // nodeId → hex color
 * }
 *
 * Color rules:
 * - Node satisfies all active filter ranges → '#93c5fd' (light blue)
 * - Node falls outside any active filter range → '#e2e8f0' (gray)
 * - Node has null for any filtered property → '#e2e8f0' (gray)
 * - No filters active (all at full range) → all nodes '#93c5fd'
 */
export function usePropertyAnalysis(
  graphData: GraphData,
  filterRanges: Map<string, [number, number]>
)
```

---

## Testing

### Unit Tests — Vitest (`src/test/`)

Only test pure functions in `lib/`. No React, no Sigma, no canvas.

**`validateGraph.test.ts`**:
- Valid input with correct `version` returns typed `GraphData`
- Missing or unknown `version` throws descriptively
- Missing `nodes` or `edges` throws descriptively
- Non-array `nodes` throws
- Node missing `id` throws
- `properties` with valid number and date string values passes
- Empty arrays are valid

**`buildGraph.test.ts`**:
- Returns correct node/edge counts
- Every node has `x` and `y` set
- Edge to unknown node is skipped with `console.warn`
- `label` and `properties` passed through as node attributes

**`detectPropertyType.test.ts`**:
- Array of ISO date strings → `'date'`
- Array of numbers → `'number'`
- Mixed array majority-wins
- Array of nulls → `'number'` (safe default)

**`computeStats.test.ts`**:
- Correct min, max, mean on known data
- Correct p50 on odd and even-length arrays
- Null values excluded from stats, counted in `nullCount`
- Single-element array returns equal min/max/mean/percentiles

**`computeHistogram.test.ts`**:
- Returns correct number of buckets
- All values fall into exactly one bucket
- Buckets span the full [min, max] range
- Empty input returns empty array

### E2E Tests — Playwright (`e2e/`)

**`drop-zone.spec.ts`**: Upload valid/invalid files, check error messages.

**`simulation.spec.ts`**: Run/stop/sliders/reset interactions.

**`property-analysis.spec.ts`**:
- Right sidebar shows all property keys with type badges after loading
- Each property has a filter slider
- Moving the min handle of a slider updates the displayed min value
- Nodes outside the filter range are visually grayed out
- Clicking a node opens the tooltip with label and all property keys
- Clicking outside the tooltip closes it
- Pressing Escape closes the tooltip

---

## Sample Fixture

Save as `e2e/fixtures/sample-graph.json`:

```json
{
  "version": "1",
  "nodes": [
    { "id": "1", "label": "Alice", "properties": { "age": 34, "score": 91.5, "joined": "2021-03-15" } },
    { "id": "2", "label": "Bob",   "properties": { "age": 28, "score": 74.0, "joined": "2023-11-02" } },
    { "id": "3", "label": "Carol", "properties": { "age": 45, "score": 55.2, "joined": "2019-07-20" } },
    { "id": "4", "label": "Dave",  "properties": { "age": 31, "score": 88.8, "joined": "2022-01-10" } },
    { "id": "5", "label": "Eve",   "properties": { "age": 27, "score": 62.1, "joined": "2024-05-30" } }
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

## Project Setup

### 1. Create the project

```bash
npm create vite@latest graph-viz -- --template react-ts
cd graph-viz
```

### 2. Install app dependencies

```bash
npm install sigma graphology graphology-layout-forceatlas2 graphology-types
```

### 3. Install Tailwind CSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

`tailwind.config.js`:
```js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. Install dev tooling

```bash
npm install -D eslint prettier eslint-config-prettier eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npx playwright install
```

### 5. vite.config.ts

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

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

### 6. playwright.config.ts

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

### 7. .eslintrc.cjs

```js
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended', 'prettier'],
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

### 8. npm scripts

```json
"scripts": {
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

### Sigma initialization

```ts
const sigma = new Sigma(graph, containerRef.current, {
  renderEdgeLabels: false,
  defaultNodeColor: '#93c5fd',
  defaultEdgeColor: '#cbd5e1',
  labelRenderedSizeThreshold: 6,
  labelFont: 'Inter, sans-serif',
})
```
