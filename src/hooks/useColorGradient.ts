import { useMemo } from 'react'
import type { CosmosGraphData, ColorGradientState, CustomPalette, PropertyType } from '@/types'
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
  // Fallback to Viridis
  return getPaletteColors('Viridis', customColors)
}

/**
 * Pure computation: derives a per-node hex color from property values and palette.
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
    const nums = entries.map((e) => e.value as number)
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    for (const e of entries) {
      const t = min === max ? 0.5 : ((e.value as number) - min) / (max - min)
      result.set(e.id, interpolateColors(colors, t))
    }
  } else if (propType === 'date') {
    const ms = entries.map((e) => new Date(e.value as string).getTime())
    const min = Math.min(...ms)
    const max = Math.max(...ms)
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
    // string: discrete, round-robin on overflow
    const distinct = Array.from(new Set(entries.map((e) => e.value as string))).sort()
    for (const e of entries) {
      const idx = distinct.indexOf(e.value as string)
      result.set(e.id, colors[idx % colors.length])
    }
  }

  return result
}

/**
 * Derives a per-node hex color from the selected property and palette,
 * applied only to active (matching) nodes.
 *
 * @param data - The CosmosGraphData (used to read node properties).
 * @param matchingNodeIds - Set of node IDs that pass all active filters.
 * @param state - Current color gradient UI state (property, palette, custom colors).
 * @param propertyTypes - Map of property key to detected type.
 * @returns `null` when no property is selected; a `Map<nodeId, hexColor>` otherwise.
 */
export function useColorGradient(
  data: CosmosGraphData | null,
  matchingNodeIds: Set<string>,
  state: ColorGradientState,
  propertyTypes: Map<string, PropertyType>,
): Map<string, string> | null {
  return useMemo(() => {
    if (state.propertyKey === null || !data) return null

    const propType = propertyTypes.get(state.propertyKey)
    if (!propType) return new Map<string, string>()

    // Collect values for active nodes (properties are on the original NodeInput objects)
    const entries: NodeValueEntry[] = []
    for (const id of matchingNodeIds) {
      const idx = data.nodeIndexMap.get(id)
      if (idx === undefined) continue
      const value = data.nodes[idx].properties?.[state.propertyKey]
      if (value !== undefined) {
        entries.push({ id, value })
      }
    }

    return computeGradientColors(entries, propType, state)
  }, [data, matchingNodeIds, state, propertyTypes])
}
