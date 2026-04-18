# Knotviz

High-performance interactive graph visualization tool built with React, TypeScript, and **@cosmos.gl/graph** (GPU-accelerated WebGL). Handles graphs with **up to 4 million nodes** in the browser. Drop a JSON graph file, explore the network visually, run GPU force-directed simulations, filter and color nodes by properties, and export the result.

![Knotviz screenshot](public/screenshots/hero.png)

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, then drag-and-drop a JSON graph file onto the drop zone (or click to browse).

## Performance and Capacity

### How big can your graph be?

| Graph Size | Load time | Interaction | Notes |
|---|---|---|---|
| 10K nodes | <1s | 60 FPS | Instant everything |
| 100K nodes | ~2s | 60 FPS | All features fluid |
| 1M nodes | ~10s | 30+ FPS | Filters/colors via Web Worker, labels auto-sampled |
| 2M nodes | ~20s | 30+ FPS | Streaming loader engages for ≥200 MB inputs |
| 3–5M nodes | ~30–60s | 15+ FPS | Only JSON and CSV can actually reach here — GraphML/GEXF OOM earlier (see below) |

### Capacity ceiling by file format

Not every format can reach the same scale. The limit is parser memory, not rendering:

| Format | Node ceiling (approx.) | Why |
|---|---|---|
| JSON | ~10M | Streaming parser (bracket counting + per-item `JSON.parse`) never holds the full tree in memory |
| CSV edge list | ~10M | Streaming parser kicks in at ≥200 MB; memory is O(unique node ids), not O(file size) |
| CSV nodes+edges pair | ~5M | Same streaming path; slightly lower because nodes file is wider |
| GraphML | ~2M | `fast-xml-parser` builds a complete DOM in memory — a 3M-node GraphML is ~720 MB on disk and peaks around 4–5 GB parsed. Use JSON/CSV for larger graphs. |
| GEXF | ~2M | Same as GraphML |

### The simulation-space ceiling (GPU-bound, not software-bound)

The force-directed simulation runs on a bounded 2D grid. The grid side length is capped at **8192 px** by WebGL texture-size limits — **this is a hardware limit, not something a bigger GPU will lift.** Every GPU tops out at 8192 for standard render targets.

Inside that bounded square, nodes can't spread indefinitely. Past a certain density the simulation keeps running correctly — the physics is still fine — but the *image* saturates:

| Graph size | What the canvas looks like at fit-view |
|---|---|
| ≤100k | Sparse, easy to trace individual connections |
| 100k–500k | Dense but clusters clearly separable |
| 500k–1M | Most of the square is covered; individual nodes start blurring into a "field of dots" |
| 1M+ | The simulation square is typically filled edge-to-edge. Community structure (clusters) is often still visible, but node-level detail requires zoom |

The exact crossover depends on your graph:
- **Strong community structure** — clusters clump, leaving empty space. Stays legible longer (often up to 2–3M nodes).
- **Uniform / random connectivity** — nodes spread evenly. Visual ceiling can hit as low as 500k.
- **Tree-like / sparse graphs** — can stay legible past 5M because they occupy less area per edge.

Past the visual ceiling, the graph is still fully interactive and filters/search/color mode work normally — you just can't read the big picture at full zoom. Zoom in, or use filter + search to narrow down to the subgraph you care about.

### Architecture

- **GPU rendering + simulation**: All rendering and force simulation run on the GPU via `@cosmos.gl/graph`. CPU does almost nothing during interaction.
- **Web Worker loading**: File parsing runs in a dedicated worker so the UI stays responsive with a progress indicator. JSON and CSV use streaming parsers for files ≥200 MB (never holds the full text in memory); smaller files use `JSON.parse` / full CSV read. GraphML and GEXF are always read in full (no SAX mode yet) — see the capacity table above.
- **Web Worker appearance pipeline**: Filter matching, gradient coloring, link visibility, and substring-search highlight are all computed in a separate worker. Main thread only posts filter/gradient/search config (~1 KB) and receives pre-built `Float32Array`s back (zero-copy transfer).
- **Compact data model**: Nodes stored as parallel arrays (`nodeIds[]`, `nodeLabels[]`) + columnar property arrays instead of full objects. ~80% less memory than `NodeInput[]`.
- **GPU shader uniforms**: Node size and edge size sliders change `pointSizeScale`/`linkWidthScale` shader uniforms — instant response, no data rebuild.
- **Cached hex-to-RGBA conversion**: Only ~20 unique colors exist in practice, but the conversion may be called millions of times. Results are cached.

### Tips for large graphs

- **Labels**: Auto-disabled during simulation for graphs >50K nodes (illegible at that scale and expensive to update).
- **Rotation**: Transforms actual node positions via rotation matrix around centre of mass — no CSS transform, canvas always fills the viewport.
- **Filters**: Filtered-out nodes are fully hidden (alpha=0, size=0), not just dimmed. Edges to hidden nodes are also hidden.
- **Search highlight**: Non-matching nodes are *dimmed* (alpha 0.1), not hidden — context stays visible. Filter visibility wins: filter-hidden nodes never reappear even if they match the search.
- **Export**: For very large graphs (>1M nodes), export creates a large JSON file. Consider disabling pretty-printing for smaller file size.

## Input Formats

Knotviz reads five file formats. All of them flow into the same internal graph model and downstream pipeline — use whichever is most convenient for your data source.

| Format | Extension | Drop | Notes |
|---|---|---|---|
| JSON | `.json` | single file | Native format, full fidelity, versioned schema |
| CSV edge list | `.csv` / `.tsv` | single file | Zero-config edge list, nodes auto-derived |
| CSV nodes+edges pair | `.csv` / `.tsv` × 2 | both files at once | Full per-node properties with typed headers |
| GraphML | `.graphml` / `.xml` | single file | W3C-ish standard; round-trips Gephi / NetworkX / yEd |
| GEXF | `.gexf` | single file | Gephi's native format, supports `viz:position` for x/y |

### Shared conventions

- **Property types**: `number`, `string`, `boolean`, `date` (ISO 8601 string), and `string[]` (multi-valued).
- **String arrays are pipe-delimited** (`red|green|blue`). Literal `|` inside a value is escaped as `\|`; literal `\` as `\\`. This convention applies to CSV, GraphML, and GEXF since none of those formats has a native array type.
- **Missing values are backfilled with type defaults on load** (`0`, `""`, `false`, `[]`, `"1970-01-01"`). A blocking modal reports the total replacement count and lets you cancel.
- **Type inference**: types are detected from values per column/property. CSV columns can optionally declare a type via the header convention below; everything else infers from samples.

### JSON

```json
{
  "version": "1",
  "nodes": [
    { "id": "1", "label": "Alice", "x": 10, "y": 20, "properties": { "age": 34, "active": true, "joined": "2021-03-15" } },
    { "id": "2", "label": "Bob" }
  ],
  "edges": [
    { "source": "1", "target": "2", "label": "knows", "weight": 0.8 }
  ],
  "nodePropertiesMetadata": {
    "age": { "description": "Age in years" }
  }
}
```

- **Nodes**: `id` (required), `label` / `x` / `y` / `properties` (all optional).
- **Edges**: `source` / `target` (required), `label` / `weight` (optional).
- **`nodePropertiesMetadata`** (optional): maps property keys to `{ description }`. Descriptions appear as help popovers in the filter panels and node tooltip.

Full schema: `src/graph/lib/graphSchema.json`.

### CSV edge list (single file)

Drop a single `.csv` or `.tsv` with one edge per row:

```csv
source,target,weight,label
alice,bob,0.8,knows
bob,carol,1.2,follows
```

`source` and `target` are required; `weight` and `label` are optional. Column names are case-insensitive. Nodes are auto-derived from the union of source+target ids (no per-node properties — use the pair format for those). Extra columns are ignored. See `scripts/csv-to-graph.mjs` for a script that converts any CSV to JSON outside the app.

### CSV nodes + edges pair

Drop both files at once. Knotviz pairs them by filename (`*nodes*.csv` + `*edges*.csv`) regardless of the drop order.

`nodes.csv`:

```csv
id,label,x,y,age:number,joined:date,active:boolean,tags:string[]
n1,Alice,10,20,34,2021-03-15,true,engineer|founder
n2,Bob,-5,8,28,2023-11-02,false,designer
```

`edges.csv` — same shape as the edge-list format above.

**Typed column headers.** Any non-structural column can declare its type via a `name:type` suffix (recognised: `number`, `string`, `boolean`, `date`, `string[]`). Headers without a suffix are inferred from sample values. `string[]` is never inferred — declare it explicitly so a legitimate string containing a pipe isn't misclassified as an array.

Structural columns (case-insensitive, no type suffix needed): `id` (required), `label`, `x`, `y`.

### GraphML

Standard GraphML with `<key>` declarations and `<data>` values:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="lbl" for="node" attr.name="label" attr.type="string"/>
  <key id="age" for="node" attr.name="age"   attr.type="int"/>
  <key id="w"   for="edge" attr.name="weight" attr.type="double"/>
  <graph edgedefault="directed">
    <node id="n1"><data key="lbl">Alice</data><data key="age">34</data></node>
    <node id="n2"><data key="lbl">Bob</data></node>
    <edge source="n1" target="n2"><data key="w">0.8</data></edge>
  </graph>
</graphml>
```

Supported `attr.type`: `int`, `long`, `float`, `double`, `boolean`, `string`. Node keys named `label`, `x`, `y` map to structural fields; edge keys named `label` and `weight` map to `EdgeInput`. Other edge data is ignored. `<default>` fallbacks are honoured. yEd-specific extensions (`<y:Geometry>`, `<y:Fill>`), hyperedges, and nested graphs are out of scope.

### GEXF

GEXF 1.3 static graphs:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" version="1.3">
  <graph mode="static" defaultedgetype="directed">
    <attributes class="node">
      <attribute id="0" title="age" type="integer"/>
    </attributes>
    <nodes>
      <node id="n1" label="Alice">
        <attvalues><attvalue for="0" value="34"/></attvalues>
        <viz:position x="10" y="20" xmlns:viz="http://gexf.net/1.3/viz"/>
      </node>
      <node id="n2" label="Bob"/>
    </nodes>
    <edges>
      <edge source="n1" target="n2" weight="0.8"/>
    </edges>
  </graph>
</gexf>
```

Supported attribute `type`: `integer`, `long`, `float`, `double`, `boolean`, `string`, `anyURI`, `liststring` (decoded via the pipe-delimited convention). Element attributes on `<edge>` (`weight`, `label`) take priority over matching attvalues. `<viz:position>` maps to node x/y; z is ignored. Dynamic mode / `<spells>`, `viz:color`, `viz:size`, and `viz:shape` are out of scope.

## Features

### Graph Visualization
- GPU-accelerated 2D graph rendering via @cosmos.gl/graph (WebGL)
- Automatic camera fit on load
- Pan (click + drag), zoom (scroll wheel), rotate (Shift + scroll or buttons)
- Node hover shows label and analysis property value in a floating tooltip
- Node click shows full property details with copy-to-clipboard (analysis property highlighted in bold)

### Canvas Controls
- Zoom in / Zoom out
- Fit to view (resets camera)
- Rotate clockwise / counter-clockwise (15 degrees per click)
- Keyboard shortcuts help popover
- All controls disabled during simulation (banner explains why)

### Display Settings
- **Node size** slider (0-20) — GPU shader uniform, instant response
- **Edge size** slider (0-5) — GPU shader uniform, instant response
- **Show edges** toggle
- **Show edge directionality** toggle — arrows at edge midpoints
- **Show node labels** toggle — renders up to 300 sampled labels as HTML overlays
- **Highlight neighbors on hover** — selects adjacent nodes, greys out the rest

### GPU Force-Directed Simulation
- Start / Stop with buttons or **Space bar**
- **Repulsion** slider — force between ALL node pairs (pushes apart)
- **Friction** slider — momentum damping
- **Link Spring** slider — force between CONNECTED nodes (pulls together)
- **Edges to keep (%)** slider — keep only top X% of edges by weight
- **Always keep strongest edge per node** checkbox
- **Restart** button — reshuffles positions and restarts simulation
- Camera auto-follows the graph during simulation via `fitView` on every tick
- Simulation runs entirely on the GPU — handles 1M+ nodes in real-time

### Analysis System
- **Color mode**: Color nodes by any property (number, string, boolean, date, string[])
  - 19 built-in palettes (Viridis, Plasma, Magma, Turbo, Blues, Grays, etc.)
  - Custom palette creation with arbitrary color stops
  - Palette reversal
  - Log scale toggle for numeric/date properties
  - Live legend (continuous gradient for numbers/dates, discrete chips for strings/booleans)
- **Size mode**: Scale node radius by property value
  - Area-proportional scaling (sqrt) so visual size matches value intuitively
  - Configurable min/max size range with editable inputs
- Statistics panel with percentiles (p25/p50/p75/p90), histogram, and sum for the selected property
- Analysis property shown on hover tooltip and highlighted in bold on click popover
- Gradient and size computation runs in Web Worker — no main-thread blocking

### Filtering System
- Per-property filters with type-specific UI:
  - **Number**: range slider with min/max text inputs, log scale toggle, histogram overlay
  - **String / String[]**: searchable multi-select with chip display
  - **Boolean**: true/false radio buttons
  - **Date**: range slider with ISO date display
- Multiple filters combine with AND logic
- Filtered-out nodes and their edges are fully hidden (not just dimmed)
- Match count shown in real-time (computed in Web Worker)
- Select all / Unselect all / Reset all controls
- Property descriptions from `nodePropertiesMetadata` shown as help popovers
- Filters work during simulation without interrupting it

### Search & Highlight
- **Substring search box** at the very top of the left sidebar — visible even before a graph is loaded (disabled in that state so the feature is discoverable). Matches against node `label` and `id` (case-insensitive)
- Matching nodes stay at full opacity; non-matching visible nodes dim to alpha 0.1 so structural context is preserved
- Edges with at least one matching endpoint stay visible; edges between two non-matching nodes are hidden (alpha 0)
- Zero-match queries show a "No matches" indicator and do not dim (so a stale/typoed query isn't mistaken for a broken view)
- Filter visibility wins: filter-hidden nodes never reappear via search. If a filter later hides some matches, the "X matches" count shrinks accordingly
- **Autocomplete dropdown** while typing shows up to 25 matching labels (click or Enter to narrow the highlight to that one node, Arrow keys to navigate, Escape or outside click to close). A footer indicates when more matches exist than fit in the sample (e.g. "Showing 25 of 12,340 matches")
- Long labels truncate with an ellipsis; the full text is available on hover via the `title` tooltip
- 150 ms input debounce — keystrokes feel instant because the input is locally controlled; only the committed query reaches the worker
- Source-agnostic primitive: the worker consumes a `highlighted: Uint8Array` bitmask regardless of origin, so future input sources (box-select, programmatic selection) reuse the same render path

### Position-Aware Loading
- If all nodes have `x`/`y` positions, they are preserved as-is
- If no nodes have positions, random positions are generated
- If some nodes have positions and others don't, all positions are randomized and a warning banner is shown

### Graph Export
- **Download** button exports the current graph with computed node positions
- Only visible nodes and edges are exported (respects active filters)
- Exported file can be re-imported to preserve the layout
- Round-trip: load -> simulate -> export -> re-import preserves positions

### Graph Info & Management
- Node and edge counts displayed in the sidebar (with filter-adjusted counts)
- Outgoing degree histogram
- Analysis and Filters panel toggles in the left sidebar for discoverability
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
| Hover node | Show label + analysis property value |

### Error Handling
- Invalid JSON, missing required fields, empty graphs — all show user-friendly error messages
- Nodes missing `id` or edges referencing unknown nodes are skipped with console warnings
- WebGL failures caught by error boundary with fallback message
- Large file OOM detected with specific error message
- Loading progress shown for large files (Reading -> Parsing -> Processing nodes/edges -> Finalizing)

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

561 unit/component tests + 137 E2E tests (4 GPU-dependent tests skipped in headless SwiftShader). All must pass before merging (`npm run test:all`).

### Unit Tests (`src/graph/test/`)

Cover pure functions: graph building, validation, null defaults, property type detection, streaming JSON parser, color gradient computation, appearance utilities (filter matching, hex conversion, color interpolation), statistics computation, edge filtering, substring query matching, highlight alpha dimming and link-color computation.

```bash
npm run test:unit
```

### Component Tests (`src/graph/components/__tests__/`)

Render isolated React components in a real Chromium browser via Vitest Browser Mode. Cover: canvas controls, node tooltip, sidebar components, filter UI (boolean, number, string, date), statistics panel, design system components.

```bash
npm run test:component
```

### E2E Tests (`e2e/`)

137 tests across 18 spec files (4 GPU-dependent tests skipped in headless SwiftShader):

| Spec file | Tests | Covers |
|---|---|---|
| `color.spec.ts` | 14 | Property selection, palette, legend types, gradient, size mode |
| `filters.spec.ts` | 13 | Filter panels, match count, AND logic, select/clear all, number filter features |
| `labels.spec.ts` | 12 | Node-label HTML overlay: visibility, zoom/pan updates, rotation follow |
| `drop-zone.spec.ts` | 11 | Initial state, file loading, invalid/empty errors, schema dialog |
| `search-highlight.spec.ts` | 14 | Disabled-before-load, substring search, case-insensitive match, label/ID match, dim highlight, autocomplete dropdown (click to narrow, Escape, outside click); regressions for filter / edge-% / gradient interactions |
| `filter-interplay.spec.ts` | 10 | Graph Info reacts to filters, statistics histogram updates, degree histogram |
| `rotation.spec.ts` | 9 | Shift+scroll rotation, rotate buttons, rotation-during-simulation gating |
| `histogram.spec.ts` | 8 | Statistics histogram, date histogram, categorical stats |
| `reset-and-export.spec.ts` | 8 | Reset flow, export, position round-trip |
| `viewport.spec.ts` | 7 | Responsive layout, sidebar collapse, left sidebar panel toggles |
| `homepage.spec.ts` | 6 | SEO, hero section, responsive, navigation |
| `edge-filtering.spec.ts` | 6 | Edge percentage, keep-at-least-one, download export |
| `graph-view.spec.ts` | 4 | Node/edge counts, filename, canvas controls, shortcuts |
| `file-management.spec.ts` | 4 | Drag overlay, confirmation dialog, file replacement |
| `zero-edges.spec.ts` | 4 | Zero-edge graph handling |
| `position-loading.spec.ts` | 4 | All/partial/no positions (1 skipped) |
| `simulation.spec.ts` | 2 | Run/Stop, Space bar toggle (skipped — GPU dependent) |
| `node-tooltip.spec.ts` | 1 | Node click tooltip (skipped — GPU dependent) |

```bash
npm run test:e2e
```

## Project Structure

```
knotviz/
├── index.html                  # Homepage (static HTML + Tailwind) — serves at /
├── graph/
│   └── index.html              # Graph SPA HTML entry — serves at /graph
├── e2e/                        # Playwright E2E tests
│   ├── fixtures/               # Test graph JSON files
│   └── *.spec.ts
├── src/
│   ├── styles/
│   │   └── globals.css         # Shared Tailwind theme, tokens, fonts
│   ├── homepage/
│   │   └── main.ts             # CSS-only entry (imports globals.css)
│   ├── graph/                  # Graph mini-app (all graph code lives here)
│   │   ├── main.tsx            # createRoot entry
│   │   ├── App.tsx             # Graph root component
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui generated components
│   │   │   ├── sidebar/        # Reusable sidebar design system
│   │   │   ├── filters/        # Filter UI components (Number, Boolean, String, Date, SearchBox)
│   │   │   ├── __tests__/      # Vitest Browser Mode component tests
│   │   │   ├── GraphView.tsx   # Main graph canvas + cosmos orchestration
│   │   │   ├── LeftSidebar.tsx # Simulation + display controls + panel toggles
│   │   │   ├── AnalysisSidebar.tsx  # Analysis (color/size) + statistics
│   │   │   ├── FiltersSidebar.tsx   # Property filters
│   │   │   ├── DropZone.tsx    # File loading with worker
│   │   │   ├── NodeTooltip.tsx # Click-to-inspect node properties
│   │   │   └── CanvasControls.tsx
│   │   ├── hooks/
│   │   │   ├── useCosmos.ts    # Core: cosmos.gl lifecycle, camera, simulation, labels
│   │   │   ├── useFilterState.ts # Filter UI state management
│   │   │   └── useFileDrop.ts, useSpacebarToggle.ts, useDebounce.ts
│   │   ├── workers/
│   │   │   ├── loadingWorker.ts     # File parsing (JSON.parse or streaming)
│   │   │   └── appearanceWorker.ts  # Filter + gradient + link visibility + search highlight
│   │   ├── lib/
│   │   │   ├── buildGraph.ts            # GraphData → CosmosGraphData
│   │   │   ├── validateGraph.ts         # JSON schema validation
│   │   │   ├── streamingJsonGraphParser.ts # Custom streaming JSON parser
│   │   │   ├── applyGradient.ts         # Color/size mapping (sqrt scaling for size)
│   │   │   ├── applyHighlight.ts        # Alpha dimming + highlight-aware link colors
│   │   │   ├── matchQuery.ts            # Pre-lowered substring match (hot path)
│   │   │   ├── collectSamples.ts        # First-N-set-bits sampler for the search dropdown
│   │   │   ├── appearanceUtils.ts       # Shared filter/color utilities
│   │   │   ├── colorScales.ts           # Palette definitions + interpolation
│   │   │   ├── computeStats.ts          # Descriptive statistics (percentiles, sum)
│   │   │   ├── computeHistogram.ts      # Histogram bucketing
│   │   │   ├── filterEdges.ts           # Edge percentage filtering
│   │   │   ├── detectPropertyTypes.ts   # Property type inference
│   │   │   ├── applyNullDefaults.ts     # Missing value backfill
│   │   │   └── graphSchema.json         # JSON schema for input validation
│   │   ├── stores/useGraphStore.ts      # Zustand store for display/simulation state
│   │   └── test/                        # Vitest unit tests
│   └── shared/                 # Code shared between apps (future use)
├── public/                     # Static assets (favicon, logos, screenshots)
├── scripts/                    # Utility scripts (graph generation, CSV conversion)
└── playwright.config.ts, vite.config.ts, tsconfig.json, eslint.config.js
```

## Generating Test Graphs

```bash
python3 scripts/generate_large_graph.py
```

Generates 2M, 3M, 4M, and 5M node graphs in `graphs_for_manual_testing/`. Each node has 4 property types (number, string, boolean, date). Edge distribution: 50% one edge, 30% two, 20% three per node.

## License

MIT — see [LICENSE](LICENSE).
