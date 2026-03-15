# Task 14: Node Tooltip

**Release:** R1 | **Chunk:** 4 — Node Tooltip
**Size:** M
**Prerequisites:** Task 07

## Goal

Clicking a node opens a floating tooltip anchored to the node's viewport position, showing all its properties formatted by type. The tooltip manages its own focus, closes via keyboard or click-outside, and flips position to stay within canvas bounds.

## Deliverables

### Files to create
- `src/components/NodeTooltip.tsx`

### Files to modify
- `src/components/GraphView.tsx` — Sigma `clickNode` handler, `tooltipState`, `tooltipStateRef` sync

## Implementation Notes

### Props
```ts
interface Props {
  nodeId: string
  screenPosition: { x: number; y: number }
  graphData: GraphData
  propertyMetas: PropertyMeta[]
  /** Resolved in GraphView: graph.getNodeAttribute(nodeId, '_defaultedProperties') ?? [] */
  defaultedProperties: string[]
  canvasBounds: DOMRect
  onClose: () => void
}
```

### Click handler in `GraphView`
```ts
sigma.on('clickNode', ({ node }) => {
  if (hasActiveFilters && !matchingNodeIds.has(node)) return  // grayed-out: ignore
  const { x, y } = sigma.graphToViewport(graph.getNodeAttributes(node))
  setTooltipState({ nodeId: node, x, y })
})
```
Pass `defaultedProperties` by reading from graph attribute when constructing tooltip props:
```ts
defaultedProperties={graph.getNodeAttribute(tooltipState.nodeId, '_defaultedProperties') ?? []}
```

### Cursor style for grayed-out nodes
```ts
sigma.on('enterNode', ({ node }) => {
  const isGrayed = hasActiveFilters && !matchingNodeIds.has(node)
  sigma.getContainer().style.cursor = isGrayed ? 'default' : 'pointer'
})
sigma.on('leaveNode', () => { sigma.getContainer().style.cursor = 'default' })
```

### Tooltip behaviour
- Opens with `autoFocus` on close button (or tooltip container)
- Close on: × button, Escape key, click outside (via `mousedown` listener on `document`)
- On close: `containerRef.current?.focus()` to return focus to canvas
- Content: `label` as heading (fallback to `id`); `id` as smaller secondary line; properties alphabetically

### Property display by type
| Type | Format |
|---|---|
| `number` | `toFixed(2)` — single line |
| `string` | as-is — single line |
| `boolean` | `"true"` or `"false"` — single line |
| `date` | Two lines: `"2021-03-15 · 1,423 days ago"` + raw ISO string (11px, muted) |
| `date` (defaulted) | Single line: raw ISO string only — suppress "· N days ago" to avoid "~20,278 days ago" |

Days formula: `Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)`

### Positioning and flip logic
- Positioned absolutely relative to Sigma canvas container
- Default: below-right of node position
- Flip horizontally if would overflow right edge; flip vertically if would overflow bottom
- Uses `canvasBounds: DOMRect` (from `containerRef.current.getBoundingClientRect()`)

### Accessibility
```tsx
<div role="dialog" aria-label="Node details" aria-modal="false">
  <button aria-label="Close" onClick={onClose}>×</button>
</div>
```

### Tooltip auto-close on filter change (wired in Task 20)
When `tooltipState` is set and the node becomes grayed-out (not in `matchingNodeIds`), call `setTooltipState(null)` in a `useEffect` watching `matchingNodeIds`.

### Selected node visual state
`nodeReducer` in Sigma (already set up in Task 07) returns `{ ...attrs, color: '#3b82f6', highlighted: true }` for the selected node — provides 2px ring effect.

## Tests

### E2E — `e2e/filters.spec.ts` (for grayed-out behaviour, added in Task 20; add click tests here)

### E2E — add to `drop-zone.spec.ts` or create `e2e/tooltip.spec.ts`
- Load `sample-graph.json`, click a node → tooltip appears with node label as heading
- Properties shown: `age`, `score`, `joined`, `active`, `status` in alphabetical order
- Date `joined` shows two lines (formatted date + raw ISO)
- Press Escape → tooltip closes
- Click outside tooltip → tooltip closes
- After close, focus returns to canvas (document.activeElement is canvas container)

### Manual verification
- Click each of the 5 nodes → tooltip shows correct data
- Click a node near the right edge → tooltip flips left
- Click a node near the bottom → tooltip flips up
- Verify `age: 34.00`, not `age: 34` (toFixed(2))
- Verify date shows both lines: `"2021-03-15 · N days ago"` and raw ISO below
