# Task 20: StringFilter Component

**Release:** R2 | **Chunk:** 6 — String + Date Filters
**Size:** M
**Prerequisites:** Task 19

## Goal

The user can filter nodes by string property values using a searchable multi-select with removable tags. Tag overflow collapses behind a "+N more" chip. Keyboard navigation works throughout the dropdown.

## Deliverables

### Files to create
- `src/components/filters/StringFilter.tsx`

## Implementation Notes

### Props
```ts
interface Props {
  state: StringFilterState
  onChange: (values: Set<string>) => void
}
```

### UI elements
- **Selected values** as removable tags above the search input
- **Search input** — case-insensitive prefix matching against `state.allValues`, debounced 150ms via `useDebounce`
- **Dropdown** (shadcn `Popover` + `Command`) — up to 10 matching values; selected ones show ✓
- **Tag overflow** — when tags exceed 2 rows: show `+N more` chip; clicking expands inline (no animation — wrapping flex container + "Show less" link at end)
- **Empty tags** (`selectedValues.size === 0`) → hint `"All values included."` All nodes pass.
- **Default ≤50 values** → all pre-selected; shows "Clear all" link
- **Default >50 values** → no restriction; placeholder `"Search to filter by specific values."`
- **Empty string display** → show as `""` (literal double-quote notation, monospace font)

### Keyboard navigation
- Up/Down arrows navigate dropdown options
- Enter selects/deselects focused option
- Escape closes dropdown

### Performance
Search matching is done against `state.allValues` (in-memory string array) — O(distinct values) per keypress, never async. Handles thousands of distinct values within a single frame.

## Tests

### E2E — `e2e/filters.spec.ts`
- Load `sample-graph.json`; find `status` filter (string type)
- Search "act" → dropdown shows "active" as a match
- Click "active" → tag appears; nodes with `status: active` highlighted
- Remove tag → nodes return to default
- All values pre-selected by default (≤50) → all nodes highlighted initially
- Click "Clear all" link in string filter → no tags, "All values included." hint shown
- Tag overflow: not tested on sample-graph (only 3 values), but structure verified

### E2E — keyboard nav
- Open string filter dropdown; press Up/Down → focus moves through options
- Press Enter → option toggled
- Press Escape → dropdown closes

### Manual verification
- Load a graph with >50 distinct string values → no restriction by default, search placeholder shown
- Empty string value `""` displayed as `""` with monospace font in both tags and dropdown
- "+3 more" chip shown when tags overflow; clicking shows all tags + "Show less"
