/** Result of edge filtering: filtered link indices + which original edges were kept. */
export interface FilteredEdgesResult {
  /** Filtered [src0,tgt0,src1,tgt1,…] ready for cosmos.setLinks(). */
  linkIndices: Float32Array
  /** Original edge indices that survived filtering (for metadata lookup). */
  keptEdgeIndices: Uint32Array
}

/**
 * Filters edges by global weight percentage, optionally protecting the strongest edge per node.
 *
 * Order of application:
 * 1. If `isKeepAtLeastOne`, pre-mark the highest-weight edge per node as protected.
 * 2. Keep top `edgePercentage`% of edges by weight (using pre-sorted order).
 * 3. Merge in any protected edges that weren't already kept.
 *
 * @param fullLinkIndices - Original [src0,tgt0,src1,tgt1,…] from GraphBuilder.finalize().
 * @param edgeSortOrder - Edge indices sorted by weight descending.
 * @param nodeCount - Total number of nodes (for protection array allocation).
 * @param totalEdgeCount - Total number of edges in the full graph.
 * @param edgePercentage - 0–100, percentage of edges to keep (by weight).
 * @param isKeepAtLeastOne - When true, the highest-weight edge per node is always kept.
 * @returns Filtered link indices and kept edge indices.
 *
 * @example
 * const result = filterEdges(data.linkIndices, data.edgeSortOrder, data.nodeCount, edgeCount, 50, true)
 */
export function filterEdges(
  fullLinkIndices: Float32Array,
  edgeSortOrder: Uint32Array,
  nodeCount: number,
  totalEdgeCount: number,
  edgePercentage: number,
  isKeepAtLeastOne: boolean,
): FilteredEdgesResult {
  // Fast path: no filtering needed
  if (edgePercentage >= 100) {
    const allIndices = new Uint32Array(totalEdgeCount)
    for (let i = 0; i < totalEdgeCount; i++) allIndices[i] = i
    return {
      linkIndices: fullLinkIndices,
      keptEdgeIndices: allIndices,
    }
  }

  // Step 1: If keepAtLeastOne, find the best edge per node (first in sort order = highest weight)
  let protectedEdges: Uint8Array | null = null
  if (isKeepAtLeastOne && totalEdgeCount > 0) {
    protectedEdges = new Uint8Array(totalEdgeCount)
    const hasProtected = new Uint8Array(nodeCount)
    for (let i = 0; i < totalEdgeCount; i++) {
      const edgeIdx = edgeSortOrder[i]
      const src = fullLinkIndices[edgeIdx * 2]
      const tgt = fullLinkIndices[edgeIdx * 2 + 1]
      if (!hasProtected[src] || !hasProtected[tgt]) {
        protectedEdges[edgeIdx] = 1
        hasProtected[src] = 1
        hasProtected[tgt] = 1
      }
    }
  }

  // Step 2: How many edges survive the percentage cut
  const pctCount = edgePercentage <= 0
    ? 0
    : Math.ceil(totalEdgeCount * edgePercentage / 100)

  // Max possible size: pctCount + protected edges that weren't in the pct set
  const maxSize = protectedEdges ? totalEdgeCount : pctCount
  const result = new Float32Array(maxSize * 2)
  const keptOriginal = new Uint32Array(maxSize)
  const keptSet = protectedEdges ? new Uint8Array(totalEdgeCount) : null
  let kept = 0

  for (let i = 0; i < pctCount; i++) {
    const edgeIdx = edgeSortOrder[i]
    const src = fullLinkIndices[edgeIdx * 2]
    const tgt = fullLinkIndices[edgeIdx * 2 + 1]
    result[kept * 2] = src
    result[kept * 2 + 1] = tgt
    keptOriginal[kept] = edgeIdx
    if (keptSet) keptSet[edgeIdx] = 1
    kept++
  }

  // Step 3: Add protected edges that weren't already kept
  if (protectedEdges) {
    for (let i = 0; i < totalEdgeCount; i++) {
      const edgeIdx = edgeSortOrder[i]
      if (protectedEdges[edgeIdx] && !keptSet![edgeIdx]) {
        result[kept * 2] = fullLinkIndices[edgeIdx * 2]
        result[kept * 2 + 1] = fullLinkIndices[edgeIdx * 2 + 1]
        keptOriginal[kept] = edgeIdx
        kept++
      }
    }
  }

  return {
    linkIndices: result.subarray(0, kept * 2),
    keptEdgeIndices: keptOriginal.subarray(0, kept),
  }
}
