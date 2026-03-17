# Grapphy

Interactive graph visualization tool built with React, Sigma.js, and Graphology. Drop a JSON graph file, explore the network visually, run physics simulations, and export the result.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, then drag-and-drop a JSON graph file onto the drop zone (or click to browse).

## Input Format

The app accepts `.json` files with this structure:

```json
{
  "version": "1",
  "nodes": [
    { "id": "1", "label": "Alice", "properties": { "age": 34, "active": true } },
    { "id": "2", "label": "Bob" }
  ],
  "edges": [
    { "source": "1", "target": "2", "label": "knows", "weight": 0.8 }
  ]
}
```

**Nodes**: `id` (required), `label` (optional), `x`/`y` (optional — positions), `properties` (optional — key/value pairs: number, string, boolean, or ISO 8601 date strings).

**Edges**: `source` and `target` (required), `label` (optional), `weight` (optional — used by FA2 simulation).

Full schema: `src/lib/graphSchema.json`

## Features

### Graph Visualization
- Interactive 2D graph rendering via Sigma.js
- Automatic camera fit on load
- Pan (click + drag), zoom (scroll wheel), rotate (Shift + scroll)

### Canvas Controls
- Zoom in / Zoom out
- Fit to view (resets camera and rotation)
- Rotate clockwise / counter-clockwise (15 degrees)
- Keyboard shortcuts help popover

### Display Settings
- **Node size** slider (0 - 10, default 5)
- **Edge size** slider (0 - 2, default 1)
- **Show edges** toggle (on by default)
- **Show node labels** toggle (off by default — shows labels above all nodes when enabled)
- **Highlight neighbors on hover** toggle (off by default — dims non-neighbors, highlights connected edges in blue)

### ForceAtlas2 Simulation
- Start / Stop simulation with buttons or **Space bar**
- **Gravity** slider (log scale 0.1 - 10.0) — controls centripetal force
- **Speed** slider (log scale 0.1 - 10.0) — controls convergence speed
- **Randomize** button — resets node positions and restarts
- Runs in a Web Worker to keep the UI responsive
- Edge weights are taken into account during simulation
- Live settings update without restarting

### Position-Aware Loading
- If all nodes have `x`/`y` positions, they are preserved as-is
- If no nodes have positions, random positions are assigned (no warning)
- If some nodes have positions and others don't, all positions are randomized and a warning banner is shown

### Graph Export
- **Download** button exports the current graph with computed node positions
- Exported file can be re-imported to preserve the layout
- Round-trip: load -> simulate -> export -> re-import preserves positions

### Graph Info & Management
- Node and edge counts displayed in the sidebar
- **Reset** button with confirmation dialog — clears graph and returns to drop zone
- Filename label shown on the canvas

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Space | Start / stop simulation |
| Scroll | Zoom in / out |
| Click + Drag | Pan |
| Shift + Scroll | Rotate |

### Error Handling
- Invalid JSON, missing required fields, empty graphs — all show user-friendly error messages
- Nodes missing `id` or edges referencing unknown nodes are skipped with console warnings
- WebGL failures caught by error boundary with fallback message

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Graph rendering | Sigma.js v3 |
| Graph data model | Graphology |
| Physics layout | graphology-layout-forceatlas2 (Web Worker) |
| UI components | shadcn/ui v4 (Base UI primitives) |
| Styling | Tailwind CSS v4 |
| Build tool | Vite 8 |
| Unit testing | Vitest |
| E2E testing | Playwright |
| Linting | ESLint 9 + Prettier |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (typecheck + bundle) |
| `npm run verify` | Typecheck + lint + unit tests |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright — Chromium + Firefox) |
| `npm run test:e2e:ui` | E2E tests with interactive Playwright UI |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run format` | Prettier formatting |

## Testing

### Unit Tests (`src/test/`)

Cover pure functions in `lib/` — graph building, validation, null defaults, property type detection.

```bash
npm run test
```

### E2E Tests (`e2e/`)

30 tests across 6 spec files, run on both Chromium and Firefox (60 total):

| Spec file | Tests | Covers |
|---|---|---|
| `drop-zone.spec.ts` | 5 | Initial state, file loading, invalid/empty file errors |
| `graph-view.spec.ts` | 4 | Node/edge counts, filename label, canvas controls, shortcuts popover |
| `simulation.spec.ts` | 4 | Run/Stop buttons, Space bar toggle, collapsible settings, help popover |
| `display-controls.spec.ts` | 5 | Slider visibility, checkbox defaults, checkbox toggling |
| `position-loading.spec.ts` | 4 | All/partial/no positions, coordinate preservation |
| `reset-and-export.spec.ts` | 7 | Reset flow, export download, position export, round-trip |

Test fixtures in `e2e/fixtures/`: sample graph, all-positions, partial-positions, weighted-edges, invalid, empty.

```bash
npm run test:e2e
```

## Project Structure

```
grapphy/
├── e2e/                 # Playwright E2E tests
│   ├── fixtures/        # Test graph JSON files
│   └── *.spec.ts        # Test specs
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui primitives
│   │   ├── sidebar/     # Reusable sidebar design system
│   │   ├── GraphView.tsx        # Main graph canvas + Sigma
│   │   ├── LeftSidebar.tsx      # All controls
│   │   ├── DropZone.tsx         # File drop/browse
│   │   ├── CanvasControls.tsx   # Zoom/rotate/fit buttons
│   │   └── KeyboardShortcutsHelp.tsx
│   ├── hooks/
│   │   ├── useFA2Simulation.ts  # FA2 Web Worker lifecycle
│   │   └── useDebounce.ts
│   ├── lib/             # Pure functions (validated, built, parsed)
│   ├── test/            # Vitest unit tests
│   ├── types.ts
│   └── App.tsx
├── scripts/             # Utility scripts (csv-to-graph converter)
└── plan/                # Product spec and roadmap
```
