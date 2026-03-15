# Task 18: PropertyFilterPanel Component

**Release:** R2 | **Chunk:** 5 — Core Filters
**Size:** S
**Prerequisites:** Tasks 16, 17

## Goal

Each property gets its own collapsible panel with an enable/disable checkbox, a type badge, and the correct filter control rendered inside. The panel collapses to show only the header, but the checkbox remains interactive when collapsed.

## Deliverables

### Files to create
- `src/components/PropertyFilterPanel.tsx`

## Implementation Notes

### Props
```ts
interface Props {
  meta: PropertyMeta
  filterState: FilterState
  onFilterChange: (state: FilterState) => void
}
```

### Header layout (left to right)
1. Chevron `▾` / `▶` — click to toggle collapse (click target: chevron only, not full row)
2. `Checkbox` — toggles `isEnabled`; remains interactive when panel is collapsed
3. Property name — truncated with `truncate` class; full name in `title` attribute
4. Type badge — 11px, rounded, `bg-slate-100`, lowercase text (`number` / `string` / `date` / `boolean`)

### Body
- Collapsed when `isExpanded === false` (local state, default: expanded)
- Renders: `<NumberFilter>`, `<BooleanFilter>`, `<StringFilter>` (Task 21), or `<DateFilter>` (Task 22) based on `meta.type`
- Disabled state: body at `opacity-50 pointer-events-none` when `!filterState.isEnabled`

### `onFilterChange` pattern
```ts
// For NumberFilter:
onChange={(min, max) => onFilterChange({ ...filterState, min, max } as NumberFilterState)}
// For BooleanFilter:
onChange={(selected) => onFilterChange({ ...filterState, selected } as BooleanFilterState)}
```

## Tests

### E2E — `e2e/filters.spec.ts`
- Right sidebar shows all 5 property keys with correct type badges after loading `sample-graph.json`
  (`age`: number, `score`: number, `joined`: date, `active`: boolean, `status`: string)
- Enable/disable checkbox: unchecking dims the filter controls and disables filtering
- Chevron click collapses panel body; checkbox still clickable when collapsed

### Manual verification
- All 5 panels visible and expanded by default
- Long property name truncated with `…` and full name shown on hover
- Unchecking "active" → filter disabled → highlighted/grayed state clears for that filter
