# Task 24: StatsTab Component

**Release:** R3 | **Chunk:** 7 — Stats Tab
**Size:** M
**Prerequisites:** Task 23

## Goal

The Stats tab shows total and filtered node counts, lets the user select a number property, and renders computed statistics + a histogram that update live as filters change.

## Deliverables

### Files to create
- `src/components/StatsTab.tsx`

### Files to modify
- `src/components/RightSidebar.tsx` — mount `<StatsTab>` in the Stats tab panel
- `src/components/GraphView.tsx` — pass `selectedStatsProperty` and `onStatsPropertyChange`

## Implementation Notes

### Props
```ts
interface Props {
  totalNodes: number
  filteredNodes: number
  numberProperties: string[]
  selectedProperty: string | null
  graph: Graph | null
  matchingNodeIds: Set<string>
  hasActiveFilters: boolean
  onPropertyChange: (key: string | null) => void
}
```

### Layout
1. `"Total: N nodes"` and `"Filtered: N nodes"` — both with `aria-live="polite"`
2. Property dropdown (`Select` from shadcn) — lists all `numberProperties`
   - If `numberProperties.length === 0`: hide dropdown and show:
     `"No number properties detected. Stats are available for number-type properties only."`
3. Stats grid: min / max / mean / median / P25 / P75
   - Values from `computeStats()` over `selectedProperty` values for `matchingNodeIds`
     (or all nodes when `hasActiveFilters === false`)
   - When `computeStats()` returns `null`: display all stat fields as `—` (em-dash)
4. `<Histogram>` below stats, fed with `computeHistogram()` result

### Stats computation
```ts
const values = [...matchingNodeIds].map(id => graph.getNodeAttribute(id, selectedProperty))
const stats = computeStats(values)  // returns null if empty
const buckets = computeHistogram(values.filter(v => v != null) as number[])
```

## Tests

### E2E — `e2e/stats.spec.ts`
- Stats tab shows total node count (5) and filtered node count
- Select `age` from dropdown → min/max/mean/median/P25/P75 appear
- Histogram renders below stats
- Hover histogram bar → bucket range + count tooltip shown
- Enable age filter to narrow set → stats update to reflect filtered nodes only
- Load graph with no number properties → "No number properties detected." message shown

### Manual verification
- All 6 stats display correctly for `age` over 5 nodes: min 27, max 45, mean 33, median 31, P25 ~28.5, P75 ~40
- Setting a filter updates "Filtered: N nodes" count live
- When 0 nodes match (zero-match filter state): all stat fields show `—`
