# Task 17: BooleanFilter Component

**Release:** R2 | **Chunk:** 5 — Core Filters
**Size:** S
**Prerequisites:** Task 15

## Goal

A three-way radio group lets the user filter by `true`, `false`, or `either` for a boolean property. Arrow keys cycle through states.

## Deliverables

### Files to create
- `src/components/filters/BooleanFilter.tsx`

## Implementation Notes

### Props
```ts
interface Props {
  state: BooleanFilterState
  onChange: (selected: BooleanFilterState['selected']) => void
}
```

### UI
- shadcn `RadioGroup` with three `RadioGroupItem` options: **true** | **false** | **either**
- shadcn `RadioGroup` provides arrow-key cycling natively between items

### Default state
`selected: 'either'` — all nodes pass (equivalent to no restriction).

### Disabled state
Controls at `opacity-50 pointer-events-none` when `!state.isEnabled` (applied by parent).

## Tests

### E2E — `e2e/filters.spec.ts`
- Select "true" for `active` filter → only Alice, Carol, Eve highlighted (active: true)
- Select "false" → only Bob and Dave highlighted
- Select "either" → all nodes return to default highlighted state

### Manual verification
- Arrow keys cycle true → false → either → true
- "either" is selected by default on load
