# Task 07: Sigma Canvas Rendering

**Release:** R1 | **Chunk:** 1 — Static Graph Viewer
**Size:** L
**Prerequisites:** Task 06

## Goal

A loaded graph is rendered on screen using Sigma.js. `GraphView` owns the Sigma instance, mounts it once, syncs node/edge colors from graph attributes, and cleans up on unmount. The user can see nodes and edges on a `#f8fafc` canvas.

## Deliverables

### Files to create
- `src/components/GraphView.tsx`
- `src/components/ErrorBoundary.tsx`

### Files to modify
- `src/App.tsx` — render `<ErrorBoundary><GraphView .../></ErrorBoundary>` when graph is loaded

## Implementation Notes

### `GraphView` props
```ts
interface Props {
  graphData: GraphData
  graph: Graph               // pre-built by DropZone, never rebuilt here
  positionMode: PositionMode
  filename: string
  onLoadNewFile: () => void
}
```

### Sigma initialisation (inside `useEffect`, runs once on mount)
```ts
const sigma = new Sigma(graph, containerRef.current!, {
  renderEdgeLabels: false,
  defaultNodeColor: '#94a3b8',
  defaultEdgeColor: '#94a3b8',
  labelRenderedSizeThreshold: 8,  // hard cutoff — see NOTE below
  labelFont: 'system-ui, sans-serif',
  labelSize: 12,
  nodeReducer: (node, attrs) => {
    if (node === tooltipStateRef.current?.nodeId) {
      return { ...attrs, color: '#3b82f6', highlighted: true }
    }
    return attrs
  },
})
```

> **NOTE:** Sigma v3's `labelRenderedSizeThreshold` is a hard visibility cutoff, not a smooth
> fade. If a ~150ms CSS opacity transition is required, verify whether Sigma v3 supports it
> natively; if not, implement a custom label renderer.

### `tooltipStateRef`
```ts
const tooltipStateRef = useRef<TooltipState | null>(null)
// Sync effect — must be added immediately after Sigma init effect:
useEffect(() => { tooltipStateRef.current = tooltipState }, [tooltipState])
```

### Node/edge color sync
Called in a `useEffect` whenever `nodeColors` map changes:
```ts
graph.updateEachNodeAttributes((node, attrs) => ({
  ...attrs,
  color: nodeColors.get(node) ?? '#94a3b8',
  size: matchingNodeIds.has(node) && hasActiveFilters ? 5 * 1.15 : 5,
}))
graph.updateEachEdgeAttributes((edge, attrs, source, target) => {
  const isGrayed = hasActiveFilters && (!matchingNodeIds.has(source) || !matchingNodeIds.has(target))
  return { ...attrs, color: isGrayed ? '#e2e8f0' : '#94a3b8', size: isGrayed ? 0.5 : 1 }
})
sigma.refresh()
```

In this task: `nodeColors` is a uniform `Map` of all nodes → `'#94a3b8'`, `hasActiveFilters` is `false`, `matchingNodeIds` = all node ids. Filters are wired in Task 20.

### Canvas background
Set on the container div: `backgroundColor: '#f8fafc'` (slate-50).

### Cleanup
```ts
return () => sigma.kill()
```

### `ErrorBoundary`
Class component with `componentDidCatch`. Fallback UI: `"Graph failed to render. Check browser console for details."` Logs: `console.error('React boundary caught:', error, errorInfo.componentStack)`.

### State owned by `GraphView` (initialised now, extended in later tasks)
```ts
const [tooltipState, setTooltipState] = useState<TooltipState | null>(null)
// Future state (Tasks 12, 14, 20, 29, 30): positionMode, simulationSettings, filterHandle, gradientState, selectedStatsProperty
```

## Tests

### E2E — `e2e/drop-zone.spec.ts` (extend existing)
- After upload, a `<canvas>` element is present in the DOM
- After upload, at least one node is rendered (Sigma canvas not empty)

### Manual verification
- Load `sample-graph.json` → 5 nodes and 6 edges visible on canvas
- Nodes are slate-coloured circles with labels visible when zoomed in
- Canvas background is light grey (#f8fafc)
- Opening browser DevTools, confirm no JS errors on load
- Resize the browser window → canvas redraws correctly
