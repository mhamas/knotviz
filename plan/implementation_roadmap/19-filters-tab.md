# Task 19: FiltersTab and useNodeColors

**Release:** R2 | **Chunk:** 5 — Core Filters
**Size:** M
**Prerequisites:** Task 18

## Goal

The Filters tab is fully functional: it shows match count, AND logic note, clear-all, zero-match banner, and all filter panels. Node and edge colors update live in the canvas as filters change. The right sidebar shell with the Filters/Stats/Color tab structure is established.

## Deliverables

### Files to create
- `src/components/FiltersTab.tsx`
- `src/components/RightSidebar.tsx`
- `src/hooks/useNodeColors.ts`

### Files to modify
- `src/components/GraphView.tsx` — connect filter state, node colors, render `<RightSidebar>`

## Implementation Notes

### `useNodeColors`
```ts
export function useNodeColors(
  graph: Graph | null,
  matchingNodeIds: Set<string>,
  hasActiveFilters: boolean,
  gradientColors: Map<string, string> | null
): Map<string, string>
```

Color rules:
- `hasActiveFilters === false` → all nodes `'#94a3b8'` (default)
- Node in `matchingNodeIds` → `'#93c5fd'` (highlighted) OR gradient color if `gradientColors` is non-null
- Node not in `matchingNodeIds` → `'#e2e8f0'` (grayed — gradient never applies)

Returns stable Map reference when nothing changed (prevents unnecessary Sigma re-renders).

### `FiltersTab` layout (top section pinned, not scrolled)
1. `"N nodes match"` with `aria-live="polite"`
2. `"Filters combine with AND — nodes must match all enabled filters."` — `text-[12px] text-slate-400 italic my-1`
3. `"Clear all filters"` button (always visible when any filter is enabled)
4. Zero-match banner (when `matchCount === 0 && hasActiveFilters`):
   ```tsx
   <div className="rounded px-3 py-2 text-sm bg-amber-50 border border-amber-200 text-amber-900">
     <p>No nodes match the current filters.</p>
     <button onClick={clearAllFilters} className="underline mt-1">Clear all filters</button>
   </div>
   ```
   Both Clear buttons (pinned + banner) remain visible simultaneously.
5. Scrollable list of `<PropertyFilterPanel>` sorted alphabetically by key

If no properties: `"No properties."` (italic, muted).

### `RightSidebar` props
```ts
interface Props {
  propertyMetas: PropertyMeta[]
  filterHandle: FilterStateHandle
  graph: Graph | null
  gradientState: ColorGradientState
  isGradientActive: boolean
  onGradientChange: (s: ColorGradientState) => void
  selectedStatsProperty: string | null
  onStatsPropertyChange: (key: string | null) => void
}
```
Width: 300px, background `#ffffff`. Uses shadcn `Tabs` with triggers: Filters | Stats | Color.

When `isGradientActive === true`, Color tab label shows blue dot:
```tsx
Color {isGradientActive && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />}
```

Stats and Color tabs are empty stubs in this task (filled in Tasks 26 and 30).

### `GraphView` color+size sync effect
```ts
useEffect(() => {
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
}, [nodeColors])
```
Never remount Sigma on filter/color changes.

## Tests

### E2E — `e2e/filters.spec.ts`
- Right sidebar tabs visible: Filters, Stats, Color
- Number filter range slider → nodes outside range turn grey on canvas
- Boolean filter "true" → nodes with `active: false` grayed
- Clear all filters → all nodes return to default color
- Zero-match banner appears when no nodes match; banner "Clear all" button works
- Switching between Filters/Stats/Color tabs does not change highlight state
- Tooltip auto-closes when its node becomes grayed by a filter change; focus returns to canvas

### Manual verification
- With `age` filter [34, 45]: Alice (34) and Carol (45) highlighted, rest grayed
- Edges connected to grayed nodes are also grayed and thinner
- "2 nodes match" count displayed
- "Clear all filters" resets everything
