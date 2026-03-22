# Cosmos.gl Migration Plan

Migrate Grapphy from **Sigma.js v3 + Graphology + ForceAtlas2** to **Cosmos.gl** for 1M+ node performance.

---

## Current vs Target Architecture

| Concern | Current (Sigma.js) | Target (Cosmos.gl) |
|---|---|---|
| Rendering engine | Sigma.js v3 (WebGL) | Cosmos.gl (WebGL, GPU shaders) |
| Graph data model | Graphology (in-memory graph object) | Plain arrays + index maps |
| Force layout | ForceAtlas2 CPU Web Worker | Cosmos.gl built-in GPU force simulation |
| Node limit | ~50K–100K interactive | 1M+ interactive |
| React integration | Manual `useEffect` lifecycle | `@cosmograph/react` (CosmographProvider + hooks) |

---

## What Changes, What Stays

### Stays (no changes needed)
- `src/lib/parseJSON.ts` — JSON parsing
- `src/lib/validateGraph.ts` — schema validation
- `src/lib/applyNullDefaults.ts` — null default replacement
- `src/lib/detectPropertyTypes.ts` — property type detection
- `src/lib/graphSchema.json` — JSON schema
- `src/lib/colorScales.ts` — palette/interpolation logic
- `src/components/DropZone.tsx` — file loading UI (minor: change return type)
- `src/components/sidebar/*` — design system components
- `src/components/filters/*` — filter UI components
- `src/hooks/useFilterState.ts` — filter state management
- `src/hooks/useDebounce.ts` — debounce utility
- `src/hooks/useSpacebarToggle.ts` — spacebar toggle (minor rewire)
- `src/stores/useGraphStore.ts` — Zustand store (minor: remove FA2-specific fields, add Cosmos ones)
- `src/types.ts` — type definitions (extend, don't replace)

### Changes (rewrite or heavy modification)
- `src/lib/buildGraph.ts` → **rewrite**: output Cosmos-compatible node/link arrays instead of Graphology graph
- `src/hooks/useSigma.ts` → **delete**, replace with `useCosmos.ts`
- `src/hooks/useFA2Simulation.ts` → **delete** (Cosmos has built-in GPU simulation)
- `src/hooks/useNodeColors.ts` → **rewrite**: compute color arrays for Cosmos accessors
- `src/hooks/useColorGradient.ts` → **rewrite**: return color map compatible with Cosmos
- `src/components/GraphView.tsx` → **rewrite**: use Cosmograph component instead of Sigma
- `src/components/LeftSidebar.tsx` → **modify**: simulation controls map to Cosmos config
- `src/components/CanvasControls.tsx` → **modify**: use Cosmos camera API
- `src/components/NodeTooltip.tsx` → **modify**: position from Cosmos coordinates

### Removed dependencies
- `graphology` (0.26.0)
- `graphology-layout` (0.6.1)
- `graphology-layout-forceatlas2` (0.10.1)
- `graphology-types` (0.24.8)
- `sigma` (3.0.2)

### Added dependencies
- `@cosmograph/cosmos` (latest)
- `@cosmograph/react` (latest)

---

## Data Model Transformation

### Current: Graphology Graph Object
```typescript
// buildGraph returns a Graphology MultiGraph
const graph = new Graph({ multi: true, type: 'directed' })
graph.addNode(id, { color, size, label, x, y, ...properties })
graph.addEdge(source, target, { color, size, label, weight })
```

### Target: Cosmos-Compatible Arrays + Index Maps
```typescript
interface CosmosGraphData {
  /** Raw node array from validated input (preserves all properties) */
  nodes: GraphNode[]
  /** Raw link array from validated input */
  links: GraphEdge[]
  /** Fast lookup: nodeId → index in nodes array */
  nodeIndexMap: Map<string, number>
  /** Fast lookup: index → nodeId */
  nodeIdByIndex: number[] // parallel to nodes array
  /** Position mode detected from input */
  positionMode: 'all' | 'partial' | 'none'
  /** Initial positions (Float32Array for Cosmos): [x0, y0, x1, y1, ...] */
  initialPositions: Float32Array | undefined
}
```

Cosmos uses **index-based** event callbacks (not node objects), so the `nodeIndexMap` is critical for mapping between node IDs and Cosmos indices.

---

## Migration Phases

### Phase 0: Preparation & Dependency Swap
**Goal**: Install Cosmos.gl, remove old deps, ensure build still compiles (with stubs).

**Tasks**:
1. Install `@cosmograph/cosmos` and `@cosmograph/react`.
2. Remove `graphology`, `graphology-layout`, `graphology-layout-forceatlas2`, `graphology-types`, `sigma` from `package.json`.
3. Create stub/placeholder for `useCosmos` hook so the app compiles.
4. Update `src/types.ts`:
   - Remove `Graph` type imports from graphology.
   - Add `CosmosGraphData` interface.
   - Keep `GraphData`, `GraphNode`, `GraphEdge` unchanged (they're input types, not rendering types).
5. Verify: `npm run typecheck` passes with stubs.

**Estimated scope**: Small — dependency management + type stubs.

---

### Phase 1: Rewrite `buildGraph.ts`
**Goal**: Transform validated `GraphData` into `CosmosGraphData` (flat arrays + index maps).

**Current behavior**:
- Creates Graphology `Graph` instance
- Adds nodes with attributes (color, size, label, x, y, properties)
- Adds edges with attributes (color, size, label, weight)
- Applies random positions if no x/y in input
- Returns `{ graph, positionMode }`

**New behavior**:
- Build `nodeIndexMap: Map<string, number>` from nodes array order
- Build `initialPositions: Float32Array` if positionMode is `'all'` (flat [x0,y0,x1,y1,...])
- Return `CosmosGraphData` with original node/link arrays + index maps
- No Graphology dependency

**Key decisions**:
- Cosmos expects links with `source`/`target` as **string IDs** (same as our input) — no conversion needed.
- Node properties stay on the original `GraphNode` objects — Cosmos doesn't need them, but our filter/color/tooltip systems do.
- Random initial positions: generate Float32Array with `Math.random()` values in [0, spaceSize] range.

**Tests**: Update `src/test/buildGraph.test.ts` to test new return type.

---

### Phase 2: Rewrite `useCosmos.ts` (replaces `useSigma.ts`)
**Goal**: Manage Cosmos.gl instance lifecycle, rendering, interaction events, camera controls.

**Responsibilities** (mapping from useSigma):

| useSigma feature | useCosmos equivalent |
|---|---|
| `new Sigma(graph, container)` | `<Cosmograph>` component via `@cosmograph/react` |
| Node/edge reducers (color, hidden, size) | Cosmos config: `nodeColor`, `nodeSize`, `linkColor` accessor functions |
| `enterNode` / `leaveNode` events | Cosmos `onNodeMouseOver` / `onNodeMouseOut` (index-based) |
| `clickNode` event → tooltip | Cosmos `onClick` callback (returns node index) |
| `clickStage` → close tooltip | Cosmos `onClick` with no node → close tooltip |
| Camera zoom/unzoom | `cosmograph.zoomIn()` / `cosmograph.zoomOut()` |
| Camera fit-to-view | `cosmograph.fitView()` |
| Camera rotation | Not supported natively in Cosmos — **drop feature** or implement via CSS transform |
| Shift+wheel rotation | **Drop** (Cosmos uses wheel exclusively for zoom) |
| `sigma.refresh()` | `cosmograph.setConfig()` triggers re-render |
| `sigma.graphToViewport()` | `cosmograph.getNodePositionByIndex()` for tooltip positioning |
| Neighbor highlighting | Manual: on hover, look up neighbors from adjacency list, update `nodeColor` accessor |
| Label rendering toggle | Cosmos `showLabels` / `showLabelsFor` config |
| Window resize | Cosmos handles automatically |

**Hook API**:
```typescript
function useCosmos(data: CosmosGraphData | null): {
  containerRef: React.RefObject<HTMLDivElement>
  cosmographRef: React.RefObject<CosmographRef>
  tooltipState: TooltipState | null
  setTooltipState: (state: TooltipState | null) => void
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleFit: () => void
}
```

**Dropped features**:
- Canvas rotation (not supported by Cosmos) — remove rotate buttons from CanvasControls
- Shift+wheel rotation — remove handler
- Edge labels (were already disabled)

---

### Phase 3: Remove FA2, Wire Cosmos GPU Simulation
**Goal**: Delete `useFA2Simulation.ts`, map simulation controls to Cosmos config.

**Current FA2 controls → Cosmos mapping**:

| Control | FA2 (current) | Cosmos config |
|---|---|---|
| Gravity slider | `layout.settings.gravity` (0.1–10) | `simulationGravity` (0–1) |
| Speed slider | `layout.settings.scalingRatio` (0.1–10) | `simulationRepulsion` (0–2) + `simulationFriction` (0–1) |
| Run/Stop toggle | `layout.start()` / `layout.stop()` | `cosmograph.start()` / `cosmograph.pause()` |
| Randomize | `random.assign()` + restart | `cosmograph.setPointPositions(randomized)` + restart |
| Space bar toggle | `useSpacebarToggle` (rewire to Cosmos start/pause) | Same hook, different callbacks |

**New simulation settings** (exposed via LeftSidebar sliders):
- **Repulsion** (`simulationRepulsion`): 0–2, default 0.5
- **Gravity** (`simulationGravity`): 0–1, default 0.25
- **Friction** (`simulationFriction`): 0–1, default 0.1
- **Link Spring** (`simulationLinkSpring`): 0–2, default 1
- **Link Distance** (`simulationLinkDistRandomVariationRange`): 0–1, default 0.2

These replace the old 2-slider (gravity + speed) system with more granular GPU simulation control.

**Zustand store updates**:
- Remove: `gravity`, `speed` fields
- Add: `repulsion`, `simulationGravity`, `friction`, `linkSpring`, `linkDistVariation`
- Keep: `nodeSize`, `edgeSize`, `isEdgesVisible`, `isNodeLabelsVisible`, `isHighlightNeighbors`

---

### Phase 4: Rewrite Filtering for Cosmos
**Goal**: Filtering works by rebuilding the visible node/link set, not by hiding nodes via reducers.

**Current approach** (Sigma):
- `useFilterState` computes `matchingNodeIds: Set<string>`
- GraphView sets `hidden: true` on non-matching nodes/edges via Graphology attributes
- Sigma reducers respect `hidden` attribute

**New approach** (Cosmos):
- `useFilterState` stays the same — still computes `matchingNodeIds`
- Instead of hiding, we have two strategies:

**Strategy A — Dimming (preferred for UX)**:
- Pass ALL nodes to Cosmos always.
- In `nodeColor` accessor: filtered-out nodes → very faint gray (`#f0f3f7` at low opacity).
- In `nodeSize` accessor: filtered-out nodes → size 0 (invisible) or very small.
- In `linkColor` accessor: links involving filtered-out nodes → transparent.
- **Pros**: No data rebuild, instant filter changes, preserves layout positions.
- **Cons**: GPU still processes all nodes (acceptable — Cosmos handles 1M+).

**Strategy B — Data rebuild (only if Strategy A causes perf issues)**:
- Rebuild node/link arrays excluding filtered nodes.
- Rebuild index maps.
- Call `cosmograph.setPointPositions()` + `cosmograph.setLinks()`.
- **Pros**: GPU processes fewer items.
- **Cons**: Layout resets on filter change, more complex.

**Decision**: Use **Strategy A** (dimming). The whole point of Cosmos is that it handles 1M+ nodes — filtering 500K to 200K isn't a meaningful GPU perf gain, and preserving layout during filtering is much better UX.

---

### Phase 5: Rewrite Node Coloring for Cosmos
**Goal**: Color system works via Cosmos `nodeColor` accessor function.

**Current approach**:
- `useColorGradient` → `Map<nodeId, hexColor>`
- `useNodeColors` → `Map<nodeId, hexColor>` (merges gradient + filter grayout)
- GraphView: `graph.updateEachNodeAttributes(...)` + `sigma.refresh()`

**New approach**:
- `useColorGradient` stays the same (returns `Map<nodeId, hexColor>`).
- `useNodeColors` stays the same (returns `Map<nodeId, hexColor>`).
- The `nodeColor` accessor in Cosmos config reads from this map:

```typescript
const nodeColorAccessor = useCallback((node: GraphNode, index: number) => {
  const id = data.nodes[index].id
  return nodeColors.get(id) ?? DEFAULT_COLOR
}, [nodeColors, data])
```

- When `nodeColors` map changes, update Cosmos config → triggers re-render.
- **No Graphology dependency** — the color hooks just need access to node data and filter state, not a graph object.

**Refactor `useColorGradient`**:
- Current: reads node attributes via `graph.getNodeAttribute(nodeId, key)`
- New: reads from `CosmosGraphData.nodes[index].properties[key]`
- Replace `Graph` parameter with `CosmosGraphData`

**Refactor `useNodeColors`**:
- Current: iterates `nodeIds: string[]`
- New: iterates `data.nodes.map(n => n.id)`
- Interface stays the same

---

### Phase 6: Rewrite Tooltip System
**Goal**: Tooltips work with Cosmos coordinate system.

**Current approach** (Sigma):
- `clickNode` event → `sigma.graphToViewport(nodeAttrs)` → screen coordinates
- Tooltip positioned absolutely at those coordinates
- Flip logic prevents off-screen overflow

**New approach** (Cosmos):
- `onClick` callback receives node **index**
- Get node position: `cosmograph.getNodePositionByIndex(index)` → `[x, y]` in screen pixels
- Look up node data: `data.nodes[index]` for label, properties, etc.
- Same tooltip component, same flip logic, different coordinate source

**Changes to `NodeTooltip.tsx`**: Minimal — it already receives position + node data as props. The change is in how GraphView computes those props.

---

### Phase 7: Rewrite GraphView Component
**Goal**: Orchestrate Cosmos rendering with all features wired up.

**Current GraphView responsibilities**:
1. Mount Sigma container
2. Apply node/edge sizes from store
3. Apply filter results (hidden attribute)
4. Apply colors (graph attribute update + sigma.refresh)
5. Apply label visibility
6. Wire tooltip
7. Wire canvas controls

**New GraphView**:
```tsx
<CosmographProvider nodes={data.nodes} links={data.links}>
  <Cosmograph
    ref={cosmographRef}
    nodeColor={nodeColorAccessor}
    nodeSize={nodeSizeAccessor}
    linkColor={linkColorAccessor}
    linkWidth={linkWidthAccessor}
    showLabels={isNodeLabelsVisible}
    showDynamicLabels={isNodeLabelsVisible}
    simulationGravity={simulationGravity}
    simulationRepulsion={repulsion}
    simulationFriction={friction}
    onClick={handleNodeClick}
    onNodeMouseOver={handleNodeHover}
    onNodeMouseOut={handleNodeLeave}
    {...cosmosConfig}
  />
  <NodeTooltip ... />
  <CanvasControls ... />
</CosmographProvider>
```

**Key differences from current GraphView**:
- No Graphology graph mutation (color/hidden attributes)
- No `sigma.refresh()` calls
- Cosmos re-renders automatically when config/accessors change
- Simulation is built-in (no separate FA2 supervisor)

---

### Phase 8: Update Sidebar Controls
**Goal**: LeftSidebar and RightSidebar work with Cosmos.

**LeftSidebar changes**:
- **Display section**: Node size and edge size sliders → map to Cosmos `nodeSize` / `linkWidth` base values
- **Edge visibility**: Toggle `showLinks` in Cosmos config
- **Label visibility**: Toggle `showLabels` in Cosmos config
- **Neighbor highlight**: On hover, compute neighbors from adjacency list, update `nodeColor` accessor to highlight
- **Simulation section**: Replace gravity/speed with repulsion/gravity/friction/linkSpring sliders
- **Run/Stop**: `cosmograph.start()` / `cosmograph.pause()`
- **Randomize**: Generate new random Float32Array, call `cosmograph.setPointPositions()`
- **Remove**: Rotation controls from CanvasControls (Cosmos doesn't support canvas rotation)

**RightSidebar changes**: Minimal — ColorTab and FiltersTab don't touch rendering directly.

---

### Phase 9: Update Export & Reset
**Goal**: Export positions from Cosmos, reset works with new data model.

**Export**:
- Current: reads positions from Graphology node attributes
- New: `cosmograph.getNodePositions()` returns positions array
- Map back to `GraphData` format: `nodes[i].x = positions[i*2]`, `nodes[i].y = positions[i*2+1]`

**Reset**:
- Same UX: confirmation dialog → clear state → return to DropZone
- `useGraphStore.resetStore()` clears Cosmos-specific state
- No Graphology cleanup needed

---

### Phase 10: Build Neighbor Adjacency Index
**Goal**: Fast neighbor lookup without Graphology (needed for highlight-neighbors feature).

**Current**: `graph.neighbors(nodeId)` — Graphology provides this.

**New**: Build adjacency list on graph load:
```typescript
interface AdjacencyIndex {
  /** nodeId → Set of neighbor nodeIds */
  neighbors: Map<string, Set<string>>
  /** nodeId → Set of connected edge indices */
  nodeEdges: Map<string, Set<number>>
}
```

Built once in `buildGraph.ts` from edges array. O(E) construction, O(1) lookup.

---

### Phase 11: Update Tests

**Unit tests** (`src/test/`):
- `buildGraph.test.ts` → rewrite for new `CosmosGraphData` return type
- Add `adjacencyIndex.test.ts` for neighbor lookup
- Color/filter tests should need minimal changes (they don't depend on Graphology)

**Component tests** (`src/components/__tests__/`):
- Update any tests that mock Graphology or Sigma
- Test Cosmos integration via `@cosmograph/react` test utilities

**E2E tests** (`e2e/`):
- Most E2E tests interact via UI, not library APIs — should need minimal changes
- Update selectors if DOM structure changes
- Verify: graph renders, simulation runs, filters work, tooltip shows, export works
- Add performance E2E test: load a 100K+ node graph, measure time-to-interactive

---

### Phase 12: Performance Optimization & Tuning
**Goal**: Tune Cosmos config for best 1M+ node experience.

**Key config tuning**:
- `spaceSize`: 4096 default, increase to 8192 for very dense graphs
- `fitViewOnInit: true` — auto-center on load
- `renderHoveredNodeRing: true` — visual hover feedback
- `nodeSizeScale`: Global size multiplier (useful for zoom-dependent sizing)
- Disable labels for >100K nodes (GPU label rendering is expensive)
- Disable link rendering for >500K nodes (configurable threshold)

**Performance thresholds** (automatic, tuned for 2M node target):
```typescript
const autoConfig = {
  showDynamicLabels: data.nodes.length < 50_000,
  showLabels: data.nodes.length < 100_000,
  showLinks: data.nodes.length < 1_000_000,
  // Above 1M links: disable link rendering for smooth 15+ FPS at 2M nodes
}
```

Users can override these defaults in the UI.

---

## Migration Order & Dependencies

```
Phase 0: Prep & deps ──────────────────────────┐
Phase 1: buildGraph rewrite ────────────────────┤
Phase 10: Adjacency index ──────────────────────┤
                                                 ├─→ Phase 2: useCosmos hook
                                                 │   Phase 3: Simulation controls
                                                 │   Phase 5: Node coloring
                                                 │   Phase 4: Filtering
                                                 │   Phase 6: Tooltip
                                                 │
                                                 ├─→ Phase 7: GraphView rewrite (needs 2-6)
                                                 ├─→ Phase 8: Sidebar updates (needs 7)
                                                 ├─→ Phase 9: Export & reset (needs 7)
                                                 ├─→ Phase 11: Test updates (needs all above)
                                                 └─→ Phase 12: Perf tuning (needs all above)
```

Phases 1, 10 can run in parallel.
Phases 2, 3, 4, 5, 6 can run in parallel (independent of each other).
Phase 7 depends on 2–6.
Phases 8, 9 depend on 7.
Phase 11 runs alongside each phase.
Phase 12 is last.

---

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Cosmos quadtree GPU issue on some Nvidia/Windows | Broken simulation for some users | Detect via `navigator.gpu` and fall back to CPU config |
| No canvas rotation in Cosmos | Feature regression | Drop rotation (minor feature, rarely used) |
| Cosmos v2 breaking changes | API instability | Pin version, read migration notes carefully |
| Tooltip positioning accuracy | Tooltip misaligned | Test thoroughly with Playwright MCP |
| Filter UX change (dimming vs hiding) | Users notice difference | Dimming is actually better UX — filtered nodes stay visible but grayed |
| Large graph label performance | Labels cause lag >100K | Auto-disable labels above threshold |
| Cosmos React integration maturity | Possible bugs | Fall back to vanilla Cosmos in useEffect if needed |

---

## Feature Parity Checklist

| Feature | Sigma.js (current) | Cosmos.gl (target) | Notes |
|---|---|---|---|
| Load graph from JSON | Yes | Yes | Same pipeline, different output format |
| Render nodes + edges | Yes | Yes | GPU-accelerated |
| Node labels | Yes (toggle) | Yes (toggle) | Auto-disable for large graphs |
| Edge labels | No (disabled) | No | Not supported in Cosmos either |
| Node hover highlight | Yes | Yes | Via `nodeColor` accessor update |
| Neighbor highlighting | Yes | Yes | Via adjacency index + `nodeColor` accessor |
| Node click → tooltip | Yes | Yes | Index-based event → DOM overlay |
| Zoom in/out | Yes | Yes | Built-in |
| Fit to view | Yes | Yes | `cosmograph.fitView()` |
| Canvas rotation | Yes | **No** | Dropped — Cosmos doesn't support |
| Force simulation | Yes (FA2, CPU) | Yes (GPU, built-in) | Much faster |
| Start/stop simulation | Yes | Yes | `start()` / `pause()` |
| Spacebar toggle | Yes | Yes | Same hook, different callbacks |
| Randomize positions | Yes | Yes | Generate Float32Array + restart |
| Gravity slider | Yes | Yes | Maps to `simulationGravity` |
| Speed slider | Yes | **Replaced** | Split into repulsion + friction |
| Node size slider | Yes | Yes | Via `nodeSize` accessor |
| Edge size slider | Yes | Yes | Via `linkWidth` accessor |
| Edge visibility toggle | Yes | Yes | `showLinks` config |
| Label visibility toggle | Yes | Yes | `showLabels` config |
| Property filters (num/str/date/bool) | Yes | Yes | Same logic, dimming instead of hiding |
| Color gradient by property | Yes | Yes | Same logic, accessor-based application |
| Custom palettes | Yes | Yes | Unchanged |
| Palette reversal | Yes | Yes | Unchanged |
| Export positions as JSON | Yes | Yes | Read from Cosmos positions |
| Reset graph | Yes | Yes | Clear state + return to DropZone |
| Keyboard shortcuts | Yes | Yes | Rewire to Cosmos API |

**Net result**: All features preserved except canvas rotation (dropped — minor feature).

---

## Success Criteria

1. **All existing features work** (see checklist above minus rotation).
2. **All tests pass**: `npm run test:all` green.
3. **100K nodes load in <3 seconds** and are interactive at 60 FPS.
4. **1M nodes load in <10 seconds** and are interactive at 30+ FPS (with auto-disabled labels).
5. **2M nodes load in <20 seconds** and are interactive at 15+ FPS (with auto-disabled labels/links).
6. **No Graphology or Sigma.js imports** remain in the codebase.
7. **Bundle size decreases** (Cosmos is lighter than Sigma + Graphology + FA2 + plugins).
