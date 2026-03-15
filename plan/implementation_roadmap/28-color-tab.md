# Task 28: ColorTab Component and Full Integration

**Release:** R4 | **Chunk:** 9 — Color Tab
**Size:** M
**Prerequisites:** Task 27

## Goal

The Color tab lets the user pick any property and a palette to color-code active nodes. A live legend shows the mapping. Custom colors can be added per-session. The Color tab indicator dot on the tab label activates when a gradient is applied. `useNodeColors` is updated to pass gradient colors through to the canvas.

## Deliverables

### Files to create
- `src/components/ColorTab.tsx`

### Files to modify
- `src/components/RightSidebar.tsx` — mount `<ColorTab>` in the Color tab panel; pass `isGradientActive`
- `src/components/GraphView.tsx` — wire `gradientState`, `useColorGradient`, update `useNodeColors` call
- `src/hooks/useNodeColors.ts` — already accepts `gradientColors` param (from Task 19 signature); ensure it routes correctly

## Implementation Notes

### `ColorTab` props
```ts
interface Props {
  propertyMetas: PropertyMeta[]
  state: ColorGradientState
  graph: Graph | null
  matchingNodeIds: Set<string>
  onChange: (s: ColorGradientState) => void
}
```

### Layout
1. **Property selector** — shadcn `Select`; all properties + "None" (default)
2. **Palette selector** — shadcn `Select`; Viridis, Plasma, Blues, Reds, Rainbow, RdBu
   - Extra item at bottom: `"＋ Add color"` — clicking reveals `<input type="color">` (native browser, no extra dep)
   - Chosen hex appended to `state.customColors`; persists for the session
3. **Gradient legend** — replaces the legend area entirely when an empty state applies:
   - **Number/date:** horizontal gradient bar with min/max labels below
   - **Boolean/string:** discrete colored chips with value labels; chips scroll horizontally if >8 values
   - **All same value (min === max for number/date):** legend replaced by `"All nodes have the same value — uniform color applied."`
4. **Empty states** (in place of legend):
   - No property selected: `"Select a property to visualise node colors."`
   - Property selected, no active node values: `"No data for selected property."`

### `isGradientActive`
`gradientState.propertyKey !== null` — passed to `RightSidebar` which shows the blue dot on the Color tab trigger.

### Canvas integration
```ts
const gradientColors = useColorGradient(graph, matchingNodeIds, gradientState)
const nodeColors = useNodeColors(graph, matchingNodeIds, hasActiveFilters, gradientColors)
// nodeColors passed to the color sync effect (already in place from Task 19)
```

## Tests

### E2E — `e2e/color.spec.ts`
- Select `age` property + Viridis → node colors change on canvas
- Grayed-out nodes (age filter active) remain `#e2e8f0` regardless of gradient
- Switch to Filters tab and back → gradient persists
- Change palette → node colors update
- Set property to "None" → all nodes return to default/filter-based color
- Active gradient indicator dot visible on Color tab label when property selected; gone when "None"
- Legend shows continuous bar for number; discrete chips for string/boolean

### Manual verification
- Select `active` (boolean) → legend shows two chips: false=low-end color, true=high-end color
- Select `status` (string) → 3 chips (active, inactive, pending) with distinct colors
- Click "＋ Add color" in palette dropdown → color picker appears; select a color → appended to legend
- Reload graph (new file) → custom colors cleared, gradient reset to None
- Load a graph where all nodes have `score = 100` → "All nodes have the same value — uniform color applied." message in legend area
