# Task 21: DateFilter Component

**Release:** R2 | **Chunk:** 6 — String + Date Filters
**Size:** S
**Prerequisites:** Task 19

## Goal

The user can filter nodes by ISO date properties using After/Before date pickers. An invalid range (after > before) is caught with inline validation and zero nodes pass until corrected.

## Deliverables

### Files to create
- `src/components/filters/DateFilter.tsx`

## Implementation Notes

### Props
```ts
interface Props {
  state: DateFilterState
  onChange: (after: string | null, before: string | null) => void
}
```

### UI
- Two `<input type="date">` elements wrapped in shadcn `Popover` for consistent cross-browser styling
- Labels: "After" (inclusive) / "Before" (inclusive)
- Placeholder text: "Any date." when no value set
- Both bounds are optional (`null` = no bound)
- Debounce: 150ms via `useDebounce`

### Validation
- When `after !== null && before !== null && after > before` (ISO string comparison works correctly for `YYYY-MM-DD`):
  - Show inline error below fields: `"After date must be earlier than Before date."`
  - Zero nodes pass the filter until corrected (filter remains enabled, just 0 matches)
  - No red border or disabled state — only the error message text

## Tests

### E2E — `e2e/filters.spec.ts`
- Load `sample-graph.json`; find `joined` filter (date type)
- Set After to `2022-01-01` → Bob (2023-11-02), Eve (2024-05-30) highlighted; Alice, Carol, Dave grayed
- Set Before to `2023-01-01` → Dave (2022-01-10) highlighted only
- Set After > Before (e.g. After 2024, Before 2020) → validation error message shown; 0 nodes match

### Manual verification
- Date pickers open on click; dates selectable
- Clearing After or Before removes the bound (all nodes in that direction pass)
- Error message disappears when dates corrected
