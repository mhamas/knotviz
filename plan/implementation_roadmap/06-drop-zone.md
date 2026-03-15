# Task 06: Drop Zone Component

**Release:** R1 | **Chunk:** 1 — Static Graph Viewer
**Size:** M
**Prerequisites:** Task 05

## Goal

A full-screen file drop zone accepts `.json` files via drag-and-drop or click-to-browse, runs the full data pipeline, shows inline errors, and shows a blocking `AlertDialog` when null defaults are applied. After this task, the app can load a graph file and pass a built `Graph` instance to its parent.

## Deliverables

### Files to create
- `src/components/DropZone.tsx`

### Files to modify
- `src/App.tsx` — render `<DropZone onLoad={handleLoad} />` as the initial screen

## Implementation Notes

### Props
```ts
interface Props {
  onLoad: (data: GraphData, graph: Graph, positionMode: PositionMode, filename: string) => void
}
```

### Behaviour
1. Drag enter/over → highlight border (e.g. `border-blue-400`)
2. Drop → run full pipeline: `parseJSON → validateGraph → applyNullDefaults → buildGraph`
3. Show spinner from drop until `onLoad` is called (covers full pipeline duration)
4. If `replacementCount > 0` → show `AlertDialog` (not Dialog — user must choose explicitly):
   - Body: `"N values were replaced with defaults. Some nodes had missing property values that were replaced with type defaults (number → 0, string → "", boolean → false, date → 1970-01-01)."`
   - Buttons: `[Cancel]` (ghost) | `[Load anyway]` (primary)
   - Cancel → discard in-memory graph, hide spinner, drop zone stays active
   - Load anyway → call `onLoad(data, graph, positionMode, filename)`
5. If `replacementCount === 0` → call `onLoad` directly, no modal
6. On any pipeline error → display inline error message below the drop zone; drop zone re-enabled immediately; spinner hidden

### `App.tsx` state
```ts
const [loadedData, setLoadedData] = useState<{
  data: GraphData; graph: Graph; positionMode: PositionMode; filename: string
} | null>(null)
```
- `loadedData === null` → render `<DropZone onLoad={handleLoad} />`
- `loadedData !== null` → render `<GraphView ... onLoadNewFile={() => setLoadedData(null)} />` (GraphView added in Task 07)

## Tests

### E2E — `e2e/drop-zone.spec.ts`
- Upload `sample-graph.json` → graph loads (canvas element present), filename shown on canvas
- Upload invalid JSON text → inline error displayed, drop zone re-enabled
- Upload file missing `nodes` field → error message contains `"File must contain nodes and edges arrays"`
- Upload file with 0 valid nodes → error message contains `"Graph has no nodes to display"`
- Spinner is visible from drop until first render frame (check spinner element visible, then gone)
- Upload `partial-positions-graph.json` → loads without error (partial warning tested in Task 12)

### Manual verification
- Drag a valid `.json` file onto the page → graph loads
- Drag an invalid `.json` file → error displayed, can drag again immediately
- Click the drop zone → native file picker opens
- Load a file with some null property values → AlertDialog appears with correct count
  - Cancel → nothing happens, drop zone resets
  - "Load anyway" → graph loads
