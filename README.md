# Grapphy

High-performance interactive graph visualization tool built with React, TypeScript, and **@cosmos.gl/graph** (GPU-accelerated WebGL). Handles graphs with **up to 4 million nodes** in the browser. Drop a JSON graph file, explore the network visually, run GPU force-directed simulations, filter and color nodes by properties, and export the result.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, then drag-and-drop a JSON graph file onto the drop zone (or click to browse).

## Performance

Grapphy is engineered for large-scale graph visualization:

| Graph Size | Load Time | Interaction | Notes |
|---|---|---|---|
| 10K nodes | < 1s | 60 FPS | Instant everything |
| 100K nodes | ~2s | 60 FPS | All features work smoothly |
| 1M nodes | ~10s | 30+ FPS | Filters/colors via Web Worker, labels sampled |
| 2M nodes | ~20s | 30+ FPS | JSON.parse in worker |
| 3-4M nodes | ~40s | 15+ FPS | Streaming JSON parser (never holds full file in memory) |

### Architecture for Performance

- **GPU rendering + simulation**: All rendering and force simulation run on the GPU via `@cosmos.gl/graph`. CPU does almost nothing during interaction.
- **Web Worker loading**: File parsing runs in a dedicated worker — the UI stays responsive with a progress indicator. Files < 200MB use fast `JSON.parse`; files >= 200MB use a custom streaming parser.
- **Web Worker appearance pipeline**: Filter matching, gradient coloring, and link visibility are computed in a separate worker. The main thread only posts filter/gradient config (~1KB) and receives pre-built `Float32Array`s back (zero-copy transfer).
- **Compact data model**: Nodes stored as parallel arrays (`nodeIds[]`, `nodeLabels[]`) + columnar property arrays instead of full objects. ~80% less memory than `NodeInput[]`.
- **GPU shader uniforms**: Node size and edge size sliders change `pointSizeScale`/`linkWidthScale` shader uniforms — instant response, no data rebuild.
- **Cached hex-to-RGBA conversion**: Only ~20 unique colors exist in practice, but the conversion may be called millions of times. Results are cached.

### Tips for Large Graphs

- **Labels**: Auto-disabled during simulation for graphs > 50K nodes (illegible at that scale and expensive to update).
- **Simulation space**: Bounded by GPU texture size (8192x8192 max). Very large graphs with strong repulsion will fill the space.
- **Rotation**: Transforms actual node positions via rotation matrix around center of mass — no CSS transform, canvas always fills the viewport.
- **Filters**: Filtered-out nodes are fully hidden (alpha=0, size=0), not just dimmed. Edges to hidden nodes are also hidden.
- **Export**: For very large graphs (> 1M nodes), export creates a large JSON file. Consider disabling pretty-printing for smaller file size.

## Input Format

The app accepts `.json` files with this structure:

```json
{
  "version": "1",
  "nodes": [
    { "id": "1", "label": "Alice", "x": 10, "y": 20, "properties": { "age": 34, "active": true, "joined": "2021-03-15" } },
    { "id": "2", "label": "Bob" }
  ],
  "edges": [
    { "source": "1", "target": "2", "label": "knows", "weight": 0.8 }
  ]
}
```

**Nodes**: `id` (required), `label` (optional), `x`/`y` (optional — initial positions), `properties` (optional — key/value pairs: number, string, boolean, or ISO 8601 date strings).

**Edges**: `source` and `target` (required), `label` (optional), `weight` (optional).

Property types are auto-detected from values: all booleans → boolean, all numbers → number, all ISO dates → date, otherwise → string. Missing property values are backfilled with type defaults (0, "", false, "1970-01-01").

Full schema: `src/lib/graphSchema.json`

## Features

### Graph Visualization
- GPU-accelerated 2D graph rendering via @cosmos.gl/graph (WebGL)
- Automatic camera fit on load
- Pan (click + drag), zoom (scroll wheel), rotate (Shift + scroll or buttons)
- Node hover shows label in a floating tooltip
- Node click shows full property details with copy-to-clipboard

### Canvas Controls
- Zoom in / Zoom out (Lucide Plus/Minus icons)
- Fit to view (resets camera)
- Rotate clockwise / counter-clockwise (15 degrees per click)
- Keyboard shortcuts help popover
- All controls disabled during simulation (banner explains why)

### Display Settings
- **Node size** slider (0–20) — GPU shader uniform, instant response
- **Edge size** slider (0–5) — GPU shader uniform, instant response
- **Show edges** toggle
- **Show node labels** toggle — renders up to 300 sampled labels as HTML overlays
- **Highlight neighbors on hover** — selects adjacent nodes, greys out the rest

### GPU Force-Directed Simulation
- Start / Stop with buttons or **Space bar**
- **Repulsion** slider — force between ALL node pairs (pushes apart)
- **Friction** slider — momentum damping (low = stops fast, high = keeps sliding)
- **Link Spring** slider — force between CONNECTED nodes (pulls together)
- **Randomize** button — shuffles positions without starting simulation
- Camera auto-follows the graph during simulation via `fitView` on every tick
- Simulation runs entirely on the GPU — handles 1M+ nodes in real-time
- All controls locked during simulation (zoom, pan, drag, rotation disabled)

### Color Gradient System
- Color nodes by any property (number, string, boolean, date)
- 15 built-in palettes (Viridis, Plasma, Magma, Turbo, Blues, etc.)
- Custom palette creation with arbitrary color stops
- Palette reversal
- Live legend showing the color mapping (continuous for numbers/dates, discrete for strings/booleans)
- Gradient computation runs in Web Worker — no main-thread blocking

### Filtering System
- Per-property filters with type-specific UI:
  - **Number**: range slider with min/max
  - **String**: searchable multi-select with chip display
  - **Boolean**: true/false radio buttons
  - **Date**: range slider with ISO date display
- Multiple filters combine with AND logic
- Filtered-out nodes and their edges are fully hidden (not just dimmed)
- Match count shown in real-time (computed in Web Worker)
- Select all / Unselect all / Reset all controls
- Filters work during simulation without interrupting it

### Position-Aware Loading
- If all nodes have `x`/`y` positions, they are preserved as-is
- If no nodes have positions, random positions are generated
- If some nodes have positions and others don't, all positions are randomized and a warning banner is shown

### Graph Export
- **Download** button exports the current graph with computed node positions
- Exported file can be re-imported to preserve the layout
- Round-trip: load → simulate → export → re-import preserves positions

### Graph Info & Management
- Node and edge counts displayed in the sidebar
- **Reset** button with confirmation dialog — clears graph and returns to drop zone
- Filename label shown on the canvas
- File replacement via drag-and-drop with confirmation dialog

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Space | Start / stop simulation |
| Scroll | Zoom in / out |
| Click + Drag | Pan |
| Shift + Scroll | Rotate canvas |
| Escape | Close tooltip |
| Hover node | Show label |

### Error Handling
- Invalid JSON, missing required fields, empty graphs — all show user-friendly error messages
- Nodes missing `id` or edges referencing unknown nodes are skipped with console warnings
- WebGL failures caught by error boundary with fallback message
- Large file OOM detected with specific error message
- Loading progress shown for large files (Reading → Parsing → Processing nodes/edges → Finalizing)

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Graph rendering + simulation | @cosmos.gl/graph (GPU-accelerated WebGL) |
| UI components | shadcn/ui v4 (Base UI primitives) |
| Icons | Lucide React |
| Styling | Tailwind CSS v4 |
| Build tool | Vite 8 |
| State management | Zustand |
| Unit testing | Vitest |
| Component testing | Vitest Browser Mode (Playwright provider) |
| E2E testing | Playwright |
| Linting | ESLint 9 + Prettier |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (typecheck + bundle) |
| `npm run test:all` | **Full gate** — typecheck + lint + unit + component + E2E |
| `npm run verify` | Typecheck + lint + unit + component tests (no E2E) |
| `npm run test` | Unit + component tests (Vitest) |
| `npm run test:unit` | Unit tests only |
| `npm run test:component` | Component tests only (real Chromium via Vitest Browser Mode) |
| `npm run test:e2e` | E2E tests (Playwright — Chromium) |
| `npm run test:e2e:ui` | E2E tests with interactive Playwright UI |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run format` | Prettier formatting |

## Testing

### Unit Tests (`src/test/`)

Cover pure functions: graph building, validation, null defaults, property type detection, streaming JSON parser, color gradient computation, appearance utilities (filter matching, hex conversion, color interpolation), JSON parsing, store management.

```bash
npm run test:unit
```

### Component Tests (`src/components/__tests__/`)

Render isolated React components in a real Chromium browser via Vitest Browser Mode. Cover: canvas controls, node tooltip, sidebar components, filter UI (boolean, number, string, date), design system components.

```bash
npm run test:component
```

### E2E Tests (`e2e/`)

44 tests across 9 spec files (4 GPU-dependent tests skipped in headless SwiftShader):

| Spec file | Tests | Covers |
|---|---|---|
| `drop-zone.spec.ts` | 11 | Initial state, file loading, invalid/empty errors, schema dialog |
| `graph-view.spec.ts` | 4 | Node/edge counts, filename, canvas controls, shortcuts |
| `simulation.spec.ts` | 2 (skipped) | Run/Stop, Space bar toggle |
| `filters.spec.ts` | 8 | Filter panels, match count, AND logic, select/clear all |
| `color.spec.ts` | 7 | Property selection, palette, legend types, gradient |
| `file-management.spec.ts` | 4 | Drag overlay, confirmation dialog, file replacement |
| `position-loading.spec.ts` | 4 (1 skipped) | All/partial/no positions |
| `node-tooltip.spec.ts` | 1 (skipped) | Node click tooltip |
| `reset-and-export.spec.ts` | 6 | Reset flow, export, position round-trip |

```bash
npm run test:e2e
```

## Project Structure

```
grapphy/
├── e2e/                     # Playwright E2E tests
│   ├── fixtures/            # Test graph JSON files
│   └── *.spec.ts
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── sidebar/         # Reusable sidebar design system
│   │   ├── filters/         # Filter UI components (Number, Boolean, String, Date)
│   │   ├── __tests__/       # Vitest Browser Mode component tests
│   │   ├── GraphView.tsx    # Main graph canvas + cosmos orchestration
│   │   ├── LeftSidebar.tsx  # Simulation + display controls
│   │   ├── RightSidebar.tsx # Colors + filters
│   │   ├── DropZone.tsx     # File loading with worker
│   │   ├── NodeTooltip.tsx  # Click-to-inspect node properties
│   │   └── CanvasControls.tsx
│   ├── hooks/
│   │   ├── useCosmos.ts     # Core: cosmos.gl lifecycle, camera, simulation, labels
│   │   ├── useFilterState.ts # Filter UI state management
│   │   └── useFileDrop.ts, useSpacebarToggle.ts, useDebounce.ts
│   ├── workers/
│   │   ├── loadingWorker.ts     # File parsing (JSON.parse or streaming)
│   │   └── appearanceWorker.ts  # Filter + gradient + link visibility
│   ├── lib/
│   │   ├── buildGraph.ts            # GraphData → CosmosGraphData
│   │   ├── validateGraph.ts         # JSON schema validation
│   │   ├── streamingJsonGraphParser.ts # Custom streaming JSON parser
│   │   ├── appearanceUtils.ts       # Shared filter/color utilities
│   │   ├── gradientColors.ts        # Gradient computation (pure function)
│   │   ├── colorScales.ts           # Palette definitions + interpolation
│   │   ├── detectPropertyTypes.ts   # Property type inference
│   │   └── applyNullDefaults.ts     # Missing value backfill
│   ├── stores/useGraphStore.ts      # Zustand store for display/simulation state
│   ├── test/                        # Vitest unit tests
│   ├── types.ts
│   └── App.tsx
├── scripts/                 # Utility scripts (graph generation)
└── graphs_for_manual_testing/ # Large test graphs (gitignored)
```

## Generating Test Graphs

```bash
python3 scripts/generate_large_graph.py
```

Generates 2M, 3M, 4M, and 5M node graphs in `graphs_for_manual_testing/`. Each node has 4 property types (number, string, boolean, date). Edge distribution: 50% one edge, 30% two, 20% three per node.
