# Task 27: useColorGradient Hook

**Release:** R4 | **Chunk:** 9 — Color Tab
**Size:** M
**Prerequisites:** Tasks 19, 26

## Goal

`useColorGradient` derives a per-node hex color from the selected property and palette, applied only to active (non-grayed) nodes. Returns `null` when no property is selected, and an empty Map when a property is selected but no active nodes have values.

## Deliverables

### Files to create
- `src/hooks/useColorGradient.ts`

## Implementation Notes

### Signature
```ts
export function useColorGradient(
  graph: Graph | null,
  matchingNodeIds: Set<string>,
  state: ColorGradientState
): Map<string, string> | null
```

### Returns
- `null` — when `state.propertyKey === null`
- `Map<string, string>` (may be empty) — when property is selected

### Color computation per property type

**Number:** continuous gradient
```ts
const t = (min === max) ? 0.5 : (value - min) / (max - min)
return interpolatePalette(state.palette, t)
```

**Date:** same as number — convert ISO string to ms via `new Date(s).getTime()` inside this hook for normalisation math only. Never store or return timestamps; stored values remain ISO strings everywhere outside this hook.

**Boolean:** binary
```ts
const colors = getPaletteColors(state.palette, state.customColors)
return value === false ? colors[0] : colors[colors.length - 1]
```

**String:** discrete, round-robin on overflow
```ts
const colors = getPaletteColors(state.palette, state.customColors)
const sortedValues = [...distinctValues].sort()
return colors[sortedValues.indexOf(value) % colors.length]
```

### min === max guard (number/date)
When all active nodes share the same value: use `interpolatePalette(palette, 0.5)` for all. Never divide by zero.

### Gradient applies only to `matchingNodeIds`
Only iterate nodes in `matchingNodeIds`. Grayed-out nodes are never included in gradient computation.

## Tests

### Manual verification (UI wired in Task 28)
- Select `age` + Viridis → youngest nodes dark purple, oldest yellow
- Select `active` (boolean) + Blues → false nodes light blue, true nodes dark blue
- Select `status` (string) + Plasma → each distinct status value gets a different color
- Select `joined` (date) + Reds → oldest join date (2019) gets low-end red, newest (2024) gets high-end
- Set a filter to show 3 nodes → gradient only colors those 3; grayed nodes remain `#e2e8f0`
- When min===max for number: uniform midpoint color applied to all active nodes
