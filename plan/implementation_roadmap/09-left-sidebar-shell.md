# Task 09: Left Sidebar Shell and Graph Info

**Release:** R1 | **Chunk:** 1 — Static Graph Viewer
**Size:** S
**Prerequisites:** Task 07

## Goal

The left sidebar is rendered with the correct width, showing node count and edge count. Simulation controls (added in Task 11) and the download button (Task 27) are placeholder stubs for now. The overall three-column layout (left sidebar | canvas | right sidebar placeholder) is established.

## Deliverables

### Files to create
- `src/components/LeftSidebar.tsx`

### Files to modify
- `src/components/GraphView.tsx` — render `<LeftSidebar>` and set up three-column layout

## Implementation Notes

### `LeftSidebar` props (full interface; only `nodeCount` and `edgeCount` are wired in this task)
```ts
interface Props {
  isRunning: boolean
  simulationError: string | null
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
Stub all simulation/download handlers with `() => {}` for now.

### Layout
- Width: 240px, background `#ffffff`, full viewport height
- 16px padding, 16px gaps between sections
- Section headers: 11px, semibold, uppercase, muted (e.g. `text-[11px] font-semibold uppercase text-slate-400`)

### Sections (this task implements **GRAPH INFO** only; others are stubs)
1. **"Load new file"** — ghost Button (stub `onClick`)
2. **SIMULATION** header — stubbed Run/Stop/sliders/Randomize (grayed/disabled)
3. **GRAPH INFO** header
4. "Nodes: N" and "Edges: N" — tabular numerals (`font-variant-numeric: tabular-nums`)

### Three-column layout in `GraphView`
```
flex flex-row h-screen
├── LeftSidebar (w-60, shrink-0)
├── <div ref={sigmaContainer}> (flex-1, relative)
│   ├── <canvas> (Sigma fills this div)
│   ├── FilenameLabel
│   └── CanvasControls
└── RightSidebar placeholder (w-75, shrink-0) — added in Task 23
```

## Tests

### Manual verification
- Load `sample-graph.json`
- Left sidebar visible on the left, 240px wide, white background
- "Nodes: 5" and "Edges: 6" shown correctly
- Graph canvas fills the remaining horizontal space
- "Load new file" button visible (click does nothing yet)
