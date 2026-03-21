import { useMemo } from 'react'
import { COLOR_DEFAULT, COLOR_GRAYED, COLOR_HIGHLIGHTED } from '../lib/colors'

/**
 * Computes a color map for all nodes based on filter state and optional gradient.
 *
 * @param nodeIds - All node IDs in the graph.
 * @param matchingNodeIds - Node IDs that pass all enabled filters.
 * @param hasActiveFilters - Whether any filter is currently enabled.
 * @param gradientColors - Optional per-node gradient colors (from useColorGradient).
 * @returns Map from nodeId to hex color string.
 */
export function useNodeColors(
  nodeIds: string[],
  matchingNodeIds: Set<string>,
  hasActiveFilters: boolean,
  gradientColors: Map<string, string> | null,
): Map<string, string> {
  return useMemo(() => {
    const map = new Map<string, string>()
    for (const id of nodeIds) {
      if (hasActiveFilters && !matchingNodeIds.has(id)) {
        map.set(id, COLOR_GRAYED)
      } else if (gradientColors?.has(id)) {
        map.set(id, gradientColors.get(id)!)
      } else if (hasActiveFilters) {
        map.set(id, COLOR_HIGHLIGHTED)
      } else {
        map.set(id, COLOR_DEFAULT)
      }
    }
    return map
  }, [nodeIds, matchingNodeIds, hasActiveFilters, gradientColors])
}
