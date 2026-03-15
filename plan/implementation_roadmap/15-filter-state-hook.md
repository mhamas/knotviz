# Task 15: useFilterState Hook

**Release:** R2 | **Chunk:** 5 — Core Filters
**Size:** M
**Prerequisites:** Task 07

## Goal

`useFilterState` manages all filter state and computes `matchingNodeIds` synchronously on every change. A pre-built node value index ensures filter evaluation stays O(nodes × enabledFilters) per change with no re-indexing.

## Deliverables

### Files to create
- `src/hooks/useFilterState.ts`

## Implementation Notes

### Return type
```ts
interface FilterStateHandle {
  filters: FilterMap
  setNumberFilter: (key: string, min: number, max: number) => void
  setStringFilter: (key: string, values: Set<string>) => void
  setDateFilter: (key: string, after: string | null, before: string | null) => void
  setBooleanFilter: (key: string, selected: BooleanFilterState['selected']) => void
  setFilterEnabled: (key: string, isEnabled: boolean) => void
  clearAllFilters: () => void
  matchingNodeIds: Set<string>
}
```

### Internal node value index (built once on graph load, never rebuilt)
```ts
const nodeValueIndex = new Map<string, Map<string, PropertyValue>>()
// propertyKey → Map<nodeId, value>
```
Built by iterating `graph.forEachNode` once per property key. All filter evaluations read from this index.

### String filter initialisation (per string property)
- Collect distinct non-null values → sort alphabetically → store as `allValues`
- If `allValues.length === 0` → `selectedValues = new Set()` (all nodes pass)
- If `allValues.length <= 50` → `selectedValues = new Set(allValues)` (all pre-selected)
- If `allValues.length > 50` → `selectedValues = new Set()` (no restriction — all nodes pass)

### Filter evaluation rules
A node passes a filter when the filter is **disabled**, OR:
- **Number:** `value >= min && value <= max`
- **String:** `selectedValues.size === 0` OR `selectedValues.has(value)`
- **Date:** `(after === null || value >= after) && (before === null || value <= before)` (string comparison valid for ISO dates)
- **Boolean:** `selected === 'either'` OR `String(value) === selected`

A node passes **all filters** when it passes every **enabled** filter.

### `matchingNodeIds` recomputation
Recomputed synchronously on every `setXxxFilter` / `clearAllFilters` call. Iterate all nodes, apply all enabled filters, collect passing node IDs into a new `Set<string>`. Returns stable `Set` reference when nothing changed.

## Tests

### Manual verification (filter UI wired in Tasks 16–19)
- After Task 19: enable number filter for `age`, set range to [30, 50] → only Carol (45) and Dave (31) highlighted
- Enable boolean filter for `active: true` → only Alice and Carol and Eve highlighted
- Both filters active (AND) → only Carol highlighted
- Clear all → all nodes return to default color
- Verify no UI freeze when changing filters on large graph (O(n) is fast enough for 50k nodes)
