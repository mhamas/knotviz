# Task 25: Graph Export (Download)

**Release:** R3 | **Chunk:** 8 — Export
**Size:** S
**Prerequisites:** Task 09

## Goal

The user can download the current graph (with live layout positions) as a schema-valid JSON file that round-trips back into the app without validation errors. A filename prompt and success toast complete the flow.

## Deliverables

### Files to modify
- `src/components/LeftSidebar.tsx` — wire "↓ Download Graph" button
- `src/components/GraphView.tsx` — implement `onDownloadGraph` handler and toast state

## Implementation Notes

### Download flow
1. User clicks "↓ Download Graph" in LeftSidebar
2. Show filename `<input type="text">` prompt via shadcn `Dialog`:
   - Pre-filled with original `filename` (including `.json` extension); input auto-selected
   - Confirm button disabled when input is empty
   - Forbidden characters: `/` and `\` — strip silently
3. On confirm: serialise and trigger download
4. Show custom toast: `"Graph downloaded."` — `<div>` positioned bottom-center, auto-dismissed via `setTimeout(hideToast, 2000)`. No Sonner.

### Serialisation
```ts
const exported: GraphData = {
  version: '1',
  nodes: graphData.nodes.map(n => ({
    ...n,
    x: graph.getNodeAttribute(n.id, 'x'),
    y: graph.getNodeAttribute(n.id, 'y'),
  })),
  edges: graphData.edges,
}
const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = filename
a.click()
URL.revokeObjectURL(url)
```

## Tests

### E2E — `e2e/export-roundtrip.spec.ts` (new file — required by DoD #55)
1. Load `sample-graph.json`
2. Run simulation for 2 seconds, then stop
3. Click "↓ Download Graph" → filename prompt appears pre-filled with `"sample-graph.json"`
4. Click Confirm → toast `"Graph downloaded."` appears and auto-dismisses
5. Drop the exported file back onto the app (after resetting to DropZone)
6. Verify: loads without validation error
7. Verify: `Math.abs(exported.x - reloaded.x) < 0.0001` for every node
8. Verify: all node `properties` objects deep-equal the originals

### Manual verification
- Click "↓ Download Graph" → dialog with pre-filled filename opens
- Clear filename → Confirm button disabled
- Enter custom filename `"my-graph"` → file downloads as `"my-graph"` (add `.json` if not present, or accept as-is)
- Re-load the downloaded file → loads cleanly, positions preserved
- Toast `"Graph downloaded."` appears in bottom center and fades after ~2s
