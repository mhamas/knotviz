# Task 12: Position-Aware Loading and Partial Position Warning

**Release:** R1 | **Chunk:** 2 — Simulation
**Size:** S
**Prerequisites:** Task 11

## Goal

When a file contains positions on all nodes, those positions are used as-is and no simulation is needed to get an initial layout. When positions are mixed or absent, they are randomised and the appropriate warning (for partial) is shown inline. Camera fits to the graph on every file load.

## Deliverables

### Files to modify
- `src/components/GraphView.tsx` — render partial-position warning; call `sigma.fit()` on mount
- `src/lib/buildGraph.ts` — position logic is already correct from Task 05; verify here

## Implementation Notes

### Position modes (already implemented in Task 05; verify behaviour)
| `positionMode` | Behaviour |
|---|---|
| `'all'` | Node x/y from file used as-is; no random layout |
| `'partial'` | All positions randomised; inline warning shown |
| `'none'` | All positions randomised; no warning |

### Camera fit on load
In the Sigma init `useEffect`:
```ts
sigma.fit()  // called once immediately after Sigma mounts
```

### Partial-position warning (rendered below canvas in `GraphView`)
```tsx
{positionMode === 'partial' && (
  <div className="mx-3 mt-2 rounded px-3 py-2 text-[13px] bg-yellow-50 border border-yellow-300 text-yellow-900">
    Some nodes have positions and some do not — positions ignored.
    Run the simulation to generate a layout.
  </div>
)}
```
Not dismissible — persists until the user loads a new file.

## Tests

### E2E — `e2e/drop-zone.spec.ts` (extend)
- Upload `partial-positions-graph.json` → loads without error; inline warning text
  `"Some nodes have positions and some do not — positions ignored."` is visible on the page

### E2E — `e2e/simulation.spec.ts` (extend)
- Upload `sample-graph.json` (no positions) → camera fits to nodes on load
- Upload a graph with all positions → nodes appear at their specified positions (not randomised)

### Manual verification
- Load `partial-positions-graph.json` → yellow warning bar appears below canvas
- Load `sample-graph.json` (no positions) → no warning bar; nodes are randomly placed
- Load a graph where all 5 nodes have x/y → no warning, positions preserved exactly
