# Filter System Implementation Plan (Tasks 15–19)

## Overview
Build the complete filter system: state management, filter UI components, and canvas integration.
After Task 19, users can filter nodes by number and boolean properties with live canvas updates.

## Task Order & Dependencies
```
15: useFilterState hook (foundation — state + evaluation logic)
 ↓
16: NumberFilter component (dual-handle range slider)
17: BooleanFilter component (three-way radio group)
 ↓  (16 + 17 can be built in parallel)
18: PropertyFilterPanel (collapsible panel per property, renders correct filter)
 ↓
19: FiltersTab + RightSidebar + useNodeColors (wiring — makes everything visible and functional)
```

## Task 15: useFilterState Hook
- **Create**: `src/hooks/useFilterState.ts`
- Build node value index once from GraphData (propertyKey → Map<nodeId, value>)
- Initialize filter state per property (number: domain min/max, boolean: either, string: all/none, date: null/null)
- Compute `matchingNodeIds` synchronously on every filter change
- **Test**: `src/test/useFilterState.test.ts` — unit tests for filter evaluation logic
- Pure logic, no UI — easy to unit test

## Task 16: NumberFilter Component
- **Create**: `src/components/filters/NumberFilter.tsx`
- Dual-handle shadcn Slider with debounced onChange (150ms)
- Display precision: ≥0.01 → toFixed(2), <0.01 → toPrecision(3)
- **Test**: E2E tests in `e2e/filters.spec.ts` (started here, expanded through T19)

## Task 17: BooleanFilter Component
- **Create**: `src/components/filters/BooleanFilter.tsx`
- shadcn RadioGroup: true | false | either
- Default: 'either' (no restriction)
- **Test**: E2E in same `e2e/filters.spec.ts`

## Task 18: PropertyFilterPanel
- **Create**: `src/components/filters/PropertyFilterPanel.tsx`
- Collapsible panel: chevron, checkbox (enable/disable), property name, type badge
- Renders NumberFilter or BooleanFilter based on property type
- Disabled state: opacity-50 pointer-events-none on body

## Task 19: FiltersTab + RightSidebar + useNodeColors
- **Create**: `src/components/FiltersTab.tsx`, `src/components/RightSidebar.tsx`, `src/hooks/useNodeColors.ts`
- **Modify**: `src/components/GraphView.tsx` — add useFilterState, useNodeColors, render RightSidebar
- **Modify**: `src/hooks/useSigma.ts` — integrate node colors from filter into nodeReducer
- RightSidebar: 300px, Tabs (Filters | Stats | Color), Stats/Color are stubs
- FiltersTab: match count, AND note, clear-all, zero-match banner, filter panels
- useNodeColors: returns Map<nodeId, color> based on matchingNodeIds + hasActiveFilters
- GraphView effect: apply colors to graph attributes, refresh Sigma
- **Test**: Full E2E suite for filter interactions

## Key Decisions
- Filter state lives in a custom hook (not Zustand) — scoped to graph lifetime, rebuilt on new graph load
- Node colors applied via graph.updateEachNodeAttributes + sigma.refresh (no Sigma remount)
- matchingNodeIds is a Set<string> recomputed synchronously (fast enough for 50k nodes)
