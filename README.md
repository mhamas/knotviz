# Knotviz

Graph visualization in the browser. GPU-accelerated via WebGL, private by default (your data never leaves the page). Drop a file, explore, filter, colour, export.

![Knotviz screenshot](public/screenshots/hero.png)

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, then drop a graph file onto the drop zone.

## Performance and Capacity

**Useful ceiling: ~1M nodes** (up to ~2M for strongly clustered graphs; below 500k everything is instant). Past 1M, Knotviz will still load the file, but two things break down at once: cosmos runs its force simulation on a fixed **8192×8192** grid (hardcoded — a better GPU does *not* lift it), so at higher counts the graph saturates into a blob and nodes pile against the boundary; and pan/zoom drops from 30+ FPS at 1M to ~15 FPS at 5M.

| Size | Load | Interaction | Fit-view looks like |
|---|---|---|---|
| 100K | ~2s | 60 FPS | Dense, clusters separated |
| 500K | ~5s | 60 FPS | Grid mostly used, distinct clusters |
| 1M | ~10s | 30+ FPS | Saturating — edge of useful |
| 2M | ~20s | 30 FPS | Only strongly clustered graphs stay legible |
| 5M | ~30s | 15 FPS | Solid blob; filter/search territory only |

**Loading limits per format** (where the tab crashes with "Aw, Snap!"). The useful ~1M ceiling is hit first for every format except GraphML:

| Format | Loads up to |
|---|---|
| JSON | ~5M (~1 GB file) |
| CSV edge list | ~5M (~215 MB file) |
| CSV nodes+edges pair | ~2M (~175 MB file) |
| GraphML | ~500k (~118 MB file) |
| GEXF | ~1M (~235 MB file) |

**GPU note.** Your `MAX_TEXTURE_SIZE` matters only as a lower bound: cosmos caps at 8192 regardless. Weaker GPUs get less and warn in the console; modern ones can't go higher.

**Past 1M nodes:** pre-filter / pre-sample before exporting, or split into subgraphs. Inside the tool, filter + search + colour + zoom carves a useful view — filter-hidden nodes are fully culled (alpha=0, size=0), so what's left reads at normal density.

## Input Formats

Five formats, one internal graph model — pick whatever fits the source.

| Format | Extension | Drop | Notes |
|---|---|---|---|
| JSON | `.json` | single file | Native, versioned schema |
| CSV edge list | `.csv` / `.tsv` | single file | Nodes auto-derived from source+target |
| CSV nodes+edges pair | `.csv` / `.tsv` × 2 | both files | Per-node properties via typed headers |
| GraphML | `.graphml` / `.xml` | single file | W3C standard (Gephi / NetworkX / yEd) |
| GEXF | `.gexf` | single file | Gephi native, `viz:position` for x/y |

**Shared conventions.** Property types: `number`, `string`, `boolean`, `date` (ISO 8601), `string[]`. String arrays are pipe-delimited (`red|green|blue`; escape literal `|` as `\|`, `\` as `\\`) — applies to CSV / GraphML / GEXF since none have native arrays. Missing values backfill on load with type defaults (`0`, `""`, `false`, `[]`, `"1970-01-01"`) — a modal reports the count and lets you cancel. Types are inferred from samples unless declared explicitly.

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
  "nodePropertiesMetadata": { "age": { "description": "Age in years" } }
}
```

Nodes: `id` required; `label`/`x`/`y`/`properties` optional. Edges: `source`/`target` required; `label`/`weight` optional. `nodePropertiesMetadata` descriptions show up as help popovers. Full schema: `src/graph/lib/graphSchema.json`.

### CSV edge list

```csv
source,target,weight,label
alice,bob,0.8,knows
bob,carol,1.2,follows
```

`source`/`target` required; `weight`/`label` optional; headers case-insensitive. Nodes auto-derived — no per-node properties (use the pair format for those).

### CSV pair

Drop both files at once; Knotviz pairs them by filename (`*nodes*.csv` + `*edges*.csv`).

```csv
id,label,x,y,age:number,joined:date,active:boolean,tags:string[]
n1,Alice,10,20,34,2021-03-15,true,engineer|founder
n2,Bob,-5,8,28,2023-11-02,false,designer
```

Edges file: same shape as edge-list. Any non-structural column can declare its type with a `name:type` suffix (`number` / `string` / `boolean` / `date` / `string[]`); headers without a suffix are inferred. `string[]` is never inferred — declare it explicitly. Structural columns (no suffix needed): `id` (required), `label`, `x`, `y`.

### GraphML

```xml
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

Supported `attr.type`: `int`, `long`, `float`, `double`, `boolean`, `string`. Node keys named `label`/`x`/`y` map to structural fields; edge keys named `label`/`weight` map to `EdgeInput`. `<default>` honoured. yEd extensions, hyperedges, nested graphs: out of scope.

### GEXF

```xml
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
    </nodes>
    <edges><edge source="n1" target="n2" weight="0.8"/></edges>
  </graph>
</gexf>
```

Supported types: `integer` / `long` / `float` / `double` / `boolean` / `string` / `anyURI` / `liststring` (pipe-decoded). Element attrs on `<edge>` (`weight`, `label`) beat matching attvalues. `<viz:position>` → node x/y (z ignored). Dynamic mode, `<spells>`, other `viz:*`: out of scope.

## Features

**Canvas.** Pan (click+drag), zoom (scroll), rotate (Shift+scroll or buttons — 15° per click), fit-to-view. Node hover shows label + analysis-property value; click opens the full property panel. Neighbour-highlight-on-hover greys out the rest. Node labels render as up to 300 HTML overlays (auto-disabled during simulation on graphs >50k).

**Force simulation.** GPU-powered. Space to start/stop. Sliders: repulsion, friction, link spring, edges-to-keep % (top X% by weight, with optional "always keep strongest per node"). Restart reshuffles positions. Camera auto-follows via `fitView` on every tick.

**Analysis — colour.** Colour by any property (number, string, boolean, date, `string[]`). 19 built-in palettes (Viridis, Plasma, Magma, Turbo, Blues, Grays, …) plus custom palette creation, reversal, and log-scale toggle for numeric/date. Live legend: continuous gradient for numbers/dates, discrete chips for strings/booleans.

**Analysis — size.** Scale node radius by any numeric property, with sqrt (area-proportional) scaling and configurable min/max range.

**Statistics.** Percentiles (p25/p50/p75/p90), sum, histogram per numeric/date property; frequency table for string/boolean. Computed in a Web Worker so the main thread stays free.

**Filters.** Per-property with type-specific UI — number (range slider + log scale + histogram overlay), string/string[] (multi-select with chips), boolean (radio), date (range slider). Multiple filters combine with AND; match count updates live. Filtered-out nodes and their edges are fully hidden (alpha=0, size=0), not dimmed. Property descriptions from `nodePropertiesMetadata` show as help popovers.

**Search.** Substring match against node `label` and `id`, case-insensitive. Matches stay opaque; others dim to alpha 0.1 so context is preserved. Autocomplete dropdown shows up to 25 matches (Enter / click narrows to one, Arrow keys to navigate, Escape to close, `X of Y matches` footer when there are more than 25). 150 ms debounce. Filter visibility always wins over search.

**Position-aware loading.** All nodes have `x`/`y` → preserved. None have them → randomised. Some have them → all randomised with a warning banner.

**Export.** One-click JSON download with computed positions. Respects active filters — only visible nodes/edges are written. Full round-trip: load → simulate → export → re-import preserves the layout.

**Graph management.** Node/edge counts (filter-adjusted) and outgoing-degree histogram in the sidebar. Reset with confirmation. Filename shown on canvas. Drag-drop over a loaded graph prompts before replacing.

**Keyboard shortcuts.** Space — start/stop simulation. Scroll — zoom. Click+drag — pan. Shift+scroll — rotate. Escape — close tooltip.

**Error handling.** User-friendly messages for invalid / empty / malformed inputs; individual bad nodes / edges are skipped with a console warning rather than failing the whole load. WebGL init failure caught by an error boundary. Large-file OOM surfaces a specific "file too large to parse" message. Loading progress reports per stage (Reading → Parsing → Processing → Finalizing).

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

Three tiers, all gated by `npm run test:all` (four GPU-dependent tests skip in headless SwiftShader):

- **Unit** (`src/graph/test/`) — pure-function coverage: graph building, validation, null defaults, property-type detection, streaming parsers, gradient/highlight computation, appearance utilities, stats, edge filtering, substring match.
- **Component** (`src/graph/components/__tests__/`) — React components in real Chromium via Vitest Browser Mode: canvas controls, node tooltip, sidebar design system, filter UI (boolean / number / string / date), statistics panel.
- **E2E** (`e2e/`) — Playwright specs for every user-visible flow: drop zone, filters, colour / size, search + autocomplete, rotation, histogram, reset & export, file replacement, homepage, zero-edge graphs, position-aware loading.

Contributor-focused details live in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Project Structure

```
knotviz/
├── index.html                  # Homepage (/), static HTML + Tailwind
├── graph/index.html            # Graph SPA entry (/graph)
├── e2e/                        # Playwright E2E tests + fixtures
├── src/
│   ├── styles/globals.css      # Shared Tailwind theme
│   ├── homepage/main.ts        # Homepage CSS entry
│   ├── graph/                  # Graph mini-app — all graph code
│   │   ├── main.tsx, App.tsx, types.ts
│   │   ├── components/         # Canvas, sidebars, filters, tooltip, drop zone
│   │   ├── hooks/              # useCosmos (cosmos lifecycle), useFilterState, useFileDrop, …
│   │   ├── workers/            # loadingWorker (parse), appearanceWorker (filter + gradient + highlight)
│   │   ├── lib/                # Pure functions: build, validate, streaming parsers, gradient, stats, …
│   │   ├── stores/             # Zustand store
│   │   └── test/               # Unit tests
│   └── shared/                 # Code shared between apps
├── public/, scripts/
└── playwright.config.ts, vite.config.ts, tsconfig.json, eslint.config.js
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the contributor-facing architecture notes.

## Generating Test Graphs

```bash
python3 scripts/generate_large_graph.py
```

Generates 2M, 3M, 4M, and 5M node graphs in `graphs_for_manual_testing/`. Each node has 4 property types (number, string, boolean, date). Edge distribution: 50% one edge, 30% two, 20% three per node.

## License

MIT — see [LICENSE](LICENSE).
