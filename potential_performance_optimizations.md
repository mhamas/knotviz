# Potential Performance Optimizations

Remaining architectural improvements identified in the performance audit (March 2026). These are larger refactors that would further improve responsiveness and memory usage for 1M+ node graphs.

---

## 1. Move `computeMatchingNodeIds` off the main thread

**Impact**: High (UI responsiveness)

`useFilterState.ts` computes `matchingNodeIds` via `useMemo`, which runs synchronously during React rendering. For 1M nodes it iterates all nodes, performs Map lookups per enabled filter, and builds a `Set<string>` of ~80MB. This blocks the main thread for 200-500ms per filter change.

The appearance worker already computes the same thing independently. The main-thread result is only used for:
- `useColorGradient` (iterates matchingNodeIds)
- Display count in FiltersTab (`matchingNodeIds.size`)

**Approach**: Eliminate the main-thread computation entirely. Have the worker return `matchingCount` (it already does) and optionally a `Uint8Array` bitmask. Move gradient computation to the worker too (it depends on which nodes are visible). The filter match count can be updated from the worker response.

---

## 2. Move color gradient computation to the worker

**Impact**: High (UI responsiveness)

`useColorGradient` runs on the main thread in a `useMemo`. For 1M matching nodes it:
- Iterates the entire `matchingNodeIds` Set (1M string hash lookups)
- Creates 1M `{ id, value }` temporary objects (~50MB)
- For dates: creates 1M `Date` objects just to extract timestamps (~100ms)
- Calls `interpolateColors` 1M times, generating 1M hex strings
- For strings: uses `indexOf` in a nested loop — O(N×D)

The worker already has `propertyColumns` and the visibility bitmask. Adding gradient computation there would eliminate ~3N main-thread iterations per color change and all the temporary object allocations.

**Approach**: Send the gradient state (property key, palette colors, isReversed) to the worker. Worker computes RGBA directly into the `pointColors` array — no hex string intermediary needed.

---

## 3. Replace adjacency `Map<string, Set<string>>` with CSR typed arrays

**Impact**: High (memory — saves ~500MB for 1M nodes)

`buildGraph.ts` creates `adjacency` and `nodeEdgeIndices` Maps. For 1M nodes with 2.7M edges:
- `adjacency`: 1M Map entries, each with a `Set<string>` of neighbor IDs → ~200-400MB
- `nodeEdgeIndices`: 1M Map entries, each with a `Set<number>` → ~200MB

These are only used for the "highlight neighbors on hover" feature (and Cosmos has its own `getAdjacentIndices()`).

**Approach**: Replace with Compressed Sparse Row (CSR) representation:
```
offsets: Uint32Array[nodeCount + 1]  — where each node's neighbors start
neighbors: Uint32Array[2 * edgeCount] — flat neighbor indices
```
Memory: ~40MB instead of ~500MB. Or just remove them entirely and use `cosmos.getAdjacentIndices(index)`.

---

## 4. Replace `nodeValueIndex` Map-of-Maps with columnar arrays

**Impact**: High (memory — saves ~1GB for 1M nodes)

`useFilterState.ts` `buildNodeValueIndex()` creates `Map<propertyKey, Map<nodeId, value>>`. For 1M nodes with 10 properties: 10 inner Maps of 1M entries each → ~500MB-1GB.

The `propertyColumns` pattern in `useCosmos.ts` already implements the right approach (arrays indexed by node index). These two data structures are redundant.

**Approach**: Use `propertyColumns` as the single source of truth. Refactor `useFilterState` to accept columnar arrays instead of building its own Map-of-Maps. This would also enable the worker to do filter initialization.

---

## 5. Move the file loading pipeline to a Web Worker

**Impact**: High (UI responsiveness during load)

The entire pipeline (`JSON.parse` → `validateGraph` → `applyNullDefaults` → `buildGraph`) runs on the main thread. For 1M nodes:
- `JSON.parse` of 355MB: 2-5s blocking
- Validation: 1-2s blocking
- Property detection + null defaults: 1s blocking
- buildGraph: 1-2s blocking

`setTimeout(0)` yields between stages let the spinner update, but each stage is a monolithic synchronous block.

**Approach**: Create a loading worker that runs the entire pipeline. Send the raw `File` (or `ArrayBuffer` from `FileReader`) to the worker. Worker parses, validates, builds graph data, and transfers back `CosmosGraphData` components as typed arrays. Main thread stays fully responsive with a progress bar.

---

## 6. Streaming JSON parsing for very large files

**Impact**: Medium (memory — reduces peak from ~3× to ~1.5× file size)

`FileReader.readAsText` loads the entire file into a JS string (~2× file size in UTF-16). Then `JSON.parse` creates another copy as JS objects. Peak memory during loading is ~3-4× file size.

**Approach**: Use a streaming JSON parser (e.g., `@streamparser/json` or `oboe.js`) that processes the file incrementally without holding the entire string in memory. Combined with a Web Worker, this would enable loading files larger than available memory.

---

## 7. Optimize `handleDownload` for large graphs

**Impact**: Medium (prevents tab crash on export)

`handleDownload` in `GraphView.tsx` does `graphData.nodes.map(n => ({ ...n, x, y }))` which creates 1M new objects, then `JSON.stringify(exported, null, 2)` which produces a multi-GB pretty-printed string. This crashes the tab for large graphs.

**Approach**: Use streaming serialization via `WritableStream` + `Blob` construction. At minimum, drop pretty-printing (`, null, 2`) which roughly doubles the output size. Consider NDJSON or binary formats for very large exports.

---

## 8. Reduce `defaultedByNode` memory

**Impact**: Low-Medium (saves ~50-100MB for 1M nodes)

`applyNullDefaults.ts` stores `defaultedByNode: Map<string, string[]>` — per-node arrays of defaulted property keys. For 1M nodes where many have missing properties, this creates up to 1M Map entries with string arrays.

This data is only used for the null-defaults modal (shows a count) and potentially tooltips.

**Approach**: Store only the total count. If per-node data is needed for tooltips, compute it lazily on click.

---

## Summary

| # | Optimization | Impact | Effort |
|---|---|---|---|
| 1 | Move filter matching to worker | UI responsiveness | Medium |
| 2 | Move gradient to worker | UI responsiveness | Medium |
| 3 | CSR adjacency arrays | Memory (-500MB) | Low |
| 4 | Columnar arrays for filters | Memory (-1GB) | Medium |
| 5 | Loading pipeline in worker | UI responsiveness | High |
| 6 | Streaming JSON parser | Memory (-1.5×) | High |
| 7 | Streaming export | Prevents crash | Medium |
| 8 | Lazy defaultedByNode | Memory (-100MB) | Low |
