# Task 26: Color Scales Library

**Release:** R4 | **Chunk:** 9 — Color Tab
**Size:** S
**Prerequisites:** Task 02

## Goal

`colorScales.ts` provides `interpolatePalette` (continuous gradient interpolation) and `getPaletteColors` (discrete stop colors) for all six built-in palettes. Both functions are pure and unit-tested.

## Deliverables

### Files to create
- `src/lib/colorScales.ts`

## Implementation Notes

### Palettes and their stop colors

| Palette | Stops (low → high) |
|---|---|
| Viridis | `#440154` `#3b528b` `#21908c` `#5dc963` `#fde725` |
| Plasma | `#0d0887` `#6a00a8` `#b12a90` `#e16462` `#fca636` `#f0f921` |
| Blues | `#f7fbff` `#c6dbef` `#6baed6` `#2171b5` `#084594` |
| Reds | `#fff5f0` `#fcbba1` `#fb6a4a` `#cb181d` `#67000d` |
| Rainbow | `#6e40aa` `#1d91c0` `#39c96c` `#efbd2e` `#e4462b` |
| RdBu | `#67001f` `#d6604d` `#f7f7f7` `#4393c3` `#053061` |

### `interpolatePalette(palette, t)`
- `t ∈ [0, 1]`
- Linear interpolation between the two surrounding stops
- Returns hex string (e.g. `"#440154"`)

### `getPaletteColors(palette, customColors)`
- Returns the built-in stop array for the palette, with `customColors` appended

## Tests

### Manual verification
- `interpolatePalette('Viridis', 0)` → `'#440154'`
- `interpolatePalette('Viridis', 1)` → `'#fde725'`
- `interpolatePalette('Viridis', 0.5)` → approximately `'#21908c'` (teal midpoint)
- `getPaletteColors('Blues', ['#ff0000'])` → Blues stops + `'#ff0000'`
- `npm run test` → all tests pass

### Unit tests (add to a new `src/test/colorScales.test.ts`)
- `interpolatePalette` at `t=0` returns first stop exactly
- `interpolatePalette` at `t=1` returns last stop exactly
- `interpolatePalette` at `t=0.5` returns a color between the two middle stops (numeric check on hex channels)
- `getPaletteColors` returns array with custom colors appended
