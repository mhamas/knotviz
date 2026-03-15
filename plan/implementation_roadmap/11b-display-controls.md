# Task 11b: Display Controls (Node Size, Edge Size, Edge Visibility)

**Release:** R1 | **Chunk:** 2 — Simulation
**Size:** S
**Prerequisites:** Task 11

## Goal

The user can control the visual size of nodes and edges via sliders, and toggle edge visibility on/off. These controls live in a new "Display" section in the left sidebar, between the Simulation and Graph Info sections.

## Deliverables

### Files to modify
- `src/components/LeftSidebar.tsx` — add Display section with node size slider, edge size slider, and hide-edges toggle
- `src/components/GraphView.tsx` — manage display state, apply size/visibility changes to graph + sigma

## Implementation Notes

### Display state (managed in GraphView)
```ts
interface DisplaySettings {
  nodeSize: number   // default 5, range [1, 20]
  edgeSize: number   // default 1, range [0.5, 5]
  isEdgesHidden: boolean  // default false
}
```

### LeftSidebar additions
New section between Simulation and Graph Info:
```
DISPLAY (section header, same style as others)
├── Node size slider [1–20], default 5, show value
├── Edge size slider [0.5–5], default 1, show value
└── Hide edges checkbox/toggle
```

Sliders use linear scale (no log). Changes are debounced at 150ms.

### Applying changes in GraphView

**Node size**: Update all node attributes when slider changes:
```ts
graph.updateEachNodeAttributes((node, attrs) => ({
  ...attrs,
  size: nodeSize,
}))
sigma.refresh()
```

**Edge size**: Same pattern:
```ts
graph.updateEachEdgeAttributes((edge, attrs) => ({
  ...attrs,
  size: edgeSize,
}))
sigma.refresh()
```

**Hide edges**: Use Sigma's `edgeReducer` to return `hidden: true`:
```ts
edgeReducer: (edge, attrs) => {
  if (isEdgesHidden) return { ...attrs, hidden: true }
  return attrs
}
```
Or alternatively, set `renderEdges: false` in Sigma settings.

### Props extension for LeftSidebar
```ts
nodeSize: number
edgeSize: number
isEdgesHidden: boolean
onNodeSizeChange: (v: number) => void
onEdgeSizeChange: (v: number) => void
onEdgesHiddenChange: (v: boolean) => void
```

## Tests

### Manual verification
- Load a graph, adjust node size slider — nodes grow/shrink smoothly
- Adjust edge size slider — edges get thicker/thinner
- Toggle hide edges — all edges disappear/reappear
- Simulation still works correctly with modified sizes
- Size changes persist across simulation start/stop
