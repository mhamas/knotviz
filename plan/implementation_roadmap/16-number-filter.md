# Task 16: NumberFilter Component

**Release:** R2 | **Chunk:** 5 — Core Filters
**Size:** S
**Prerequisites:** Task 15

## Goal

A dual-handle range slider lets the user narrow down nodes by a numeric property. The current range is debounced before being applied to the filter state.

## Deliverables

### Files to create
- `src/components/filters/NumberFilter.tsx`

## Implementation Notes

### Props
```ts
interface Props {
  state: NumberFilterState
  onChange: (min: number, max: number) => void
}
```

### UI
- shadcn `Slider` with `min={state.domainMin}`, `max={state.domainMax}`, `value={[state.min, state.max]}`
- Display current low and high values below the track
- `onChange` is debounced 150ms inside this component via `useDebounce`

### Display precision
- `|value| >= 0.01` → `toFixed(2)`
- `|value| < 0.01` → `toPrecision(3)` (prevents `0.001` from rounding to `"0.00"`)
- Raw (unrounded) value used for filter comparison

### Disabled state
When `!state.isEnabled`: slider and label at `opacity-50 pointer-events-none` (applied by parent `PropertyFilterPanel`).

## Tests

### E2E — `e2e/filters.spec.ts`
- Load `sample-graph.json`; navigate to Filters tab; find the `age` filter
- Move lower handle → nodes outside new range become grayed out
- Current range values update below the slider

### Manual verification
- Drag lower `age` handle to 30 → Alice (34), Dave (31), Carol (45) highlighted; Bob (28) and Eve (27) grayed
- Drag upper `age` handle to 40 → only Alice (34) and Dave (31) highlighted
- Values beneath slider update in real-time (visual feedback during drag), filter applies after 150ms debounce
