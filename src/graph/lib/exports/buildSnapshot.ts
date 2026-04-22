import type { CosmosGraphData, PropertyMeta } from '../../types'
import type { PropertyColumns } from '../../hooks/useFilterState'
import type { ExportSnapshot, ExportNode, ExportEdge } from './types'

/**
 * Walk the current cosmos state + filter bitmasks and produce a compact,
 * format-agnostic snapshot that any serializer can consume.
 *
 * Only visible nodes and surviving edges are included — the same
 * filter-respecting behaviour the JSON download has always had.
 *
 * @param positions - Flat [x0, y0, x1, y1, ...] from `cosmos.getPointPositions()`.
 * @param cosmosData - The graph data backing cosmos (node ids, labels, edge indices).
 * @param visibleNodes - Uint8Array bitmask of per-node visibility after filters. If undefined, all nodes are visible.
 * @param keptEdgeIndices - Edge indices that survived the edges-to-keep slider.
 * @param propertyMetas - Declared property types, in the order they should appear on export.
 * @param propertyColumns - Per-property column arrays indexed by node index.
 */
export function buildExportSnapshot(
  positions: ArrayLike<number>,
  cosmosData: CosmosGraphData,
  visibleNodes: Uint8Array | null | undefined,
  keptEdgeIndices: ArrayLike<number>,
  propertyMetas: PropertyMeta[],
  propertyColumns: PropertyColumns,
): ExportSnapshot {
  const nodes: ExportNode[] = []
  for (let i = 0; i < cosmosData.nodeCount; i++) {
    if (visibleNodes && !visibleNodes[i]) continue
    const properties: Record<string, string | number | boolean | string[]> = {}
    for (const meta of propertyMetas) {
      const v = propertyColumns[meta.key]?.[i]
      if (v === undefined) continue
      // Non-finite numbers (NaN, ±Infinity) are dropped at the snapshot
      // boundary so every downstream serializer sees clean data. JSON
      // would emit `null`, CSV would render "Infinity" (which won't
      // re-import as a number), XML parsers outright reject these
      // tokens — the consistent choice is "treat as missing".
      if (typeof v === 'number' && !Number.isFinite(v)) continue
      properties[meta.key] = v
    }
    const clampedX = Number.isFinite(positions[i * 2] ?? 0) ? (positions[i * 2] ?? 0) : 0
    const clampedY = Number.isFinite(positions[i * 2 + 1] ?? 0) ? (positions[i * 2 + 1] ?? 0) : 0
    const node: ExportNode = {
      id: cosmosData.nodeIds[i],
      x: clampedX,
      y: clampedY,
      properties,
    }
    const label = cosmosData.nodeLabels[i]
    // Drop empty-string labels just like the pre-refactor JSON download did;
    // downstream serializers all treat "no label" identically.
    if (label !== undefined && label !== '') node.label = label
    nodes.push(node)
  }

  const edges: ExportEdge[] = []
  for (let k = 0; k < keptEdgeIndices.length; k++) {
    const i = keptEdgeIndices[k]
    const srcIdx = cosmosData.edgeSources[i]
    const tgtIdx = cosmosData.edgeTargets[i]
    if (visibleNodes && (!visibleNodes[srcIdx] || !visibleNodes[tgtIdx])) continue
    const edge: ExportEdge = {
      source: cosmosData.nodeIds[srcIdx],
      target: cosmosData.nodeIds[tgtIdx],
    }
    const weight = cosmosData.edgeWeights?.[i]
    if (weight !== undefined && weight !== 0) edge.weight = weight
    edges.push(edge)
  }

  return { nodes, edges, propertyMetas }
}
