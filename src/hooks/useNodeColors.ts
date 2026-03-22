import { useMemo } from 'react'

/**
 * Computes a sparse color map: only nodes with non-default colors are included.
 * Nodes not in the map get COLOR_DEFAULT in the rendering pipeline.
 * This avoids creating 1M+ Map entries when no gradient is active.
 *
 * @param nodeIds - All node IDs in the graph.
 * @param matchingNodeIds - Node IDs that pass all enabled filters.
 * @param hasActiveFilters - Whether any filter is currently enabled.
 * @param gradientColors - Optional per-node gradient colors (from useColorGradient).
 * @returns Sparse map from nodeId to hex color string (only non-default entries).
 */
export function useNodeColors(
  nodeIds: string[],
  matchingNodeIds: Set<string>,
  hasActiveFilters: boolean,
  gradientColors: Map<string, string> | null,
): Map<string, string> {
  return useMemo(() => {
    // Fast path: no gradient active → all visible nodes get default color.
    // Return empty map — applyFilteredAppearance uses COLOR_DEFAULT for missing entries.
    if (!gradientColors) {
      return new Map<string, string>()
    }

    // Gradient active: only include gradient-colored nodes.
    // Filtered-out nodes are handled by applyFilteredAppearance via matchingNodeIds.
    const map = new Map<string, string>()
    for (const [id, color] of gradientColors) {
      if (!hasActiveFilters || matchingNodeIds.has(id)) {
        map.set(id, color)
      }
    }
    return map
  }, [nodeIds, matchingNodeIds, hasActiveFilters, gradientColors])
}
