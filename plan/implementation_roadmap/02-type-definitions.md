# Task 02: Type Definitions

**Release:** R1 | **Chunk:** 1 — Static Graph Viewer
**Size:** S
**Prerequisites:** Task 01

## Goal

All shared TypeScript types are defined in one place. Every subsequent task imports from `src/types.ts` — no type is defined inline in a component or hook.

## Deliverables

### Files to create
- `src/types.ts` — complete type module (no runtime code, types only)

### Types to define (exact shapes)

**Input schema:**
```ts
type PropertyValue = number | string | boolean
interface NodeInput { id: string; label?: string; x?: number; y?: number; properties?: Record<string, PropertyValue> }
interface EdgeInput { source: string; target: string; label?: string }
interface GraphData { version: string; nodes: NodeInput[]; edges: EdgeInput[] }
```

**Property system:**
```ts
type PropertyType = 'number' | 'string' | 'date' | 'boolean'
interface PropertyMeta { key: string; type: PropertyType }
```

**Filter state:**
```ts
interface NumberFilterState  { type: 'number';  isEnabled: boolean; min: number; max: number; domainMin: number; domainMax: number }
interface StringFilterState  { type: 'string';  isEnabled: boolean; selectedValues: Set<string>; allValues: string[] }
interface DateFilterState    { type: 'date';    isEnabled: boolean; after: string | null; before: string | null }
interface BooleanFilterState { type: 'boolean'; isEnabled: boolean; selected: 'true' | 'false' | 'either' }
type FilterState = NumberFilterState | StringFilterState | DateFilterState | BooleanFilterState
type FilterMap = Map<string, FilterState>
```

**Stats:**
```ts
interface PropertyStats { min: number; max: number; mean: number; median: number; p25: number; p75: number }
interface HistogramBucket { from: number; to: number; count: number }
```

**Color gradient:**
```ts
type PaletteName = 'Viridis' | 'Plasma' | 'Blues' | 'Reds' | 'Rainbow' | 'RdBu'
interface ColorGradientState { propertyKey: string | null; palette: PaletteName; customColors: string[] }
```

**Tooltip + pipeline:**
```ts
interface TooltipState { nodeId: string; x: number; y: number }
interface NullDefaultResult { data: GraphData; replacementCount: number; defaultedByNode: Map<string, string[]> }
type PositionMode = 'all' | 'none' | 'partial'
```

## Tests

### Manual verification
- `npm run build` compiles without type errors
- `npm run lint` passes with zero errors on `src/types.ts`
- No runtime import errors (import types in `App.tsx` as a smoke test, then remove)
