import type { ColorGradientState, CustomPalette, PropertyType } from '@/types'
import { interpolateColors, isBuiltinPalette, getPaletteColors } from '@/lib/colorScales'

/** Entry pairing a node ID with its raw property value. */
interface NodeValueEntry {
  id: string
  value: unknown
}

/**
 * Resolve a palette identifier to its color stops array.
 * Checks built-in palettes first, then custom palettes, with fallback.
 */
function resolveColors(
  palette: string,
  customColors: string[],
  customPalettes: CustomPalette[],
): string[] {
  if (isBuiltinPalette(palette)) {
    return getPaletteColors(palette, customColors)
  }
  const custom = customPalettes.find((p) => p.id === palette)
  if (custom) return [...custom.colors, ...customColors]
  return getPaletteColors('Viridis', customColors)
}

/**
 * Pure computation: derives a per-node hex color from property values and palette.
 * Used by unit tests. Production gradient computation happens in the appearance worker.
 *
 * @param entries - Active node IDs with their property values.
 * @param propType - Detected type of the property.
 * @param state - Color gradient settings (palette, custom colors).
 * @returns Map from nodeId to hex color string (may be empty).
 */
export function computeGradientColors(
  entries: NodeValueEntry[],
  propType: PropertyType,
  state: ColorGradientState,
): Map<string, string> {
  const colors = resolveColors(state.palette, state.customColors, state.customPalettes)
  if (state.isReversed) colors.reverse()
  const result = new Map<string, string>()

  if (entries.length === 0) return result

  if (propType === 'number') {
    let min = entries[0].value as number
    let max = min
    for (let i = 1; i < entries.length; i++) {
      const v = entries[i].value as number
      if (v < min) min = v
      if (v > max) max = v
    }
    for (const e of entries) {
      const t = min === max ? 0.5 : ((e.value as number) - min) / (max - min)
      result.set(e.id, interpolateColors(colors, t))
    }
  } else if (propType === 'date') {
    const ms = entries.map((e) => new Date(e.value as string).getTime())
    let min = ms[0]
    let max = min
    for (let i = 1; i < ms.length; i++) {
      if (ms[i] < min) min = ms[i]
      if (ms[i] > max) max = ms[i]
    }
    for (let i = 0; i < entries.length; i++) {
      const t = min === max ? 0.5 : (ms[i] - min) / (max - min)
      result.set(entries[i].id, interpolateColors(colors, t))
    }
  } else if (propType === 'boolean') {
    for (const e of entries) {
      const isTrue = e.value as boolean
      result.set(e.id, isTrue ? colors[colors.length - 1] : colors[0])
    }
  } else {
    // string: discrete, round-robin
    const distinctMap = new Map<string, number>()
    const distinctValues: string[] = []
    for (const e of entries) {
      if (!distinctMap.has(e.value as string)) {
        distinctMap.set(e.value as string, distinctValues.length)
        distinctValues.push(e.value as string)
      }
    }
    distinctValues.sort()
    distinctMap.clear()
    for (let i = 0; i < distinctValues.length; i++) {
      distinctMap.set(distinctValues[i], i)
    }
    for (const e of entries) {
      const idx = distinctMap.get(e.value as string)!
      result.set(e.id, colors[idx % colors.length])
    }
  }

  return result
}
