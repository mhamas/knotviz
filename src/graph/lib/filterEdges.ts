/** Result of edge filtering: filtered link indices + which original edges were kept. */
export interface FilteredEdgesResult {
  /** Filtered [src0,tgt0,src1,tgt1,…] ready for cosmos.setLinks(). */
  linkIndices: Float32Array
  /** Original edge indices that survived filtering (for metadata lookup). */
  keptEdgeIndices: Uint32Array
  /** Max outgoing degree after percentage filter (for dynamic slider range). */
  sliderMaxOutgoing: number
  /** Max incoming degree after percentage + outgoing filter (for dynamic slider range). */
  sliderMaxIncoming: number
  /** Max outgoing degree in the final filtered edges. */
  finalMaxOutgoing: number
  /** Max incoming degree in the final filtered edges. */
  finalMaxIncoming: number
}

/**
 * Filters edges by global weight percentage, per-node max outgoing, and per-node max incoming.
 *
 * Order of application:
 * 1. If `isKeepAtLeastOne`, pre-mark the highest-weight edge per node as protected.
 * 2. Keep top `edgePercentage`% of edges by weight (using pre-sorted order).
 * 3. From those, limit each node to at most `maxOutgoing` outgoing edges (highest weight kept).
 * 4. From those, limit each node to at most `maxIncoming` incoming edges (highest weight kept).
 * 5. Merge in any protected edges that weren't already kept.
 *
 * Also computes slider max degrees after each stage for dynamic slider ranges.
 *
 * @param fullLinkIndices - Original [src0,tgt0,src1,tgt1,…] from buildGraph.
 * @param edgeSortOrder - Edge indices sorted by weight descending.
 * @param nodeCount - Total number of nodes (for degree array allocation).
 * @param totalEdgeCount - Total number of edges in the full graph.
 * @param edgePercentage - 0–100, percentage of edges to keep (by weight).
 * @param maxOutgoing - Max outgoing edges per source node. Edges beyond this are dropped.
 * @param maxOutgoingDegree - Max outgoing degree in the full graph (for fast-path check).
 * @param maxIncoming - Max incoming edges per target node. Edges beyond this are dropped.
 * @param maxIncomingDegree - Max incoming degree in the full graph (for fast-path check).
 * @param isKeepAtLeastOne - When true, the highest-weight edge per node is always kept.
 * @returns Filtered link indices, kept edge indices, and slider max degrees for slider ranges.
 *
 * @example
 * const result = filterEdges(data.linkIndices, data.edgeSortOrder, data.nodeCount, edgeCount, 50, 10, data.maxOutgoingDegree, 5, data.maxIncomingDegree, true)
 */
export function filterEdges(
  fullLinkIndices: Float32Array,
  edgeSortOrder: Uint32Array,
  nodeCount: number,
  totalEdgeCount: number,
  edgePercentage: number,
  maxOutgoing: number,
  maxOutgoingDegree: number,
  maxIncoming: number,
  maxIncomingDegree: number,
  isKeepAtLeastOne: boolean,
): FilteredEdgesResult {
  // Fast path: no filtering needed
  if (edgePercentage >= 100 && maxOutgoing >= maxOutgoingDegree && maxIncoming >= maxIncomingDegree) {
    const allIndices = new Uint32Array(totalEdgeCount)
    for (let i = 0; i < totalEdgeCount; i++) allIndices[i] = i
    return {
      linkIndices: fullLinkIndices,
      keptEdgeIndices: allIndices,
      sliderMaxOutgoing: maxOutgoingDegree,
      sliderMaxIncoming: maxIncomingDegree,
      finalMaxOutgoing: maxOutgoingDegree,
      finalMaxIncoming: maxIncomingDegree,
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

  // Step 3: Apply percentage + max-outgoing filter (only source node degree is capped)
  const isOutgoingLimited = maxOutgoing < maxOutgoingDegree
  const outDegree = isOutgoingLimited ? new Uint32Array(nodeCount) : null

  // Collect edges surviving pct + outgoing in a temp buffer
  const maxSize = protectedEdges ? totalEdgeCount : pctCount
  const afterOutgoing = new Uint32Array(maxSize) // stores original edge indices
  let afterOutgoingCount = 0

  // Also compute slider max outgoing degree (from edges surviving percentage only)
  const pctOutDegree = new Uint32Array(nodeCount)

  for (let i = 0; i < pctCount; i++) {
    const edgeIdx = edgeSortOrder[i]
    const src = fullLinkIndices[edgeIdx * 2]

    // Track outgoing degree after percentage filter (before outgoing cap)
    pctOutDegree[src]++

    if (outDegree) {
      if (outDegree[src] >= maxOutgoing) {
        continue
      }
      outDegree[src]++
    }

    afterOutgoing[afterOutgoingCount++] = edgeIdx
  }

  // Compute sliderMaxOutgoing from pctOutDegree
  let sliderMaxOutgoing = 0
  for (let i = 0; i < nodeCount; i++) {
    if (pctOutDegree[i] > sliderMaxOutgoing) sliderMaxOutgoing = pctOutDegree[i]
  }

  // Step 4: Apply max-incoming filter on edges surviving pct + outgoing
  const isIncomingLimited = maxIncoming < maxIncomingDegree
  const inDegree = isIncomingLimited ? new Uint32Array(nodeCount) : null

  // Also compute slider max incoming degree (from edges surviving pct + outgoing)
  const afterOutInDegree = new Uint32Array(nodeCount)

  const result = new Float32Array(maxSize * 2)
  const keptOriginal = new Uint32Array(maxSize)
  const keptSet = protectedEdges ? new Uint8Array(totalEdgeCount) : null
  let kept = 0

  for (let i = 0; i < afterOutgoingCount; i++) {
    const edgeIdx = afterOutgoing[i]
    const src = fullLinkIndices[edgeIdx * 2]
    const tgt = fullLinkIndices[edgeIdx * 2 + 1]

    // Track incoming degree after outgoing filter (before incoming cap)
    afterOutInDegree[tgt]++

    if (inDegree) {
      if (inDegree[tgt] >= maxIncoming) {
        continue
      }
      inDegree[tgt]++
    }

    result[kept * 2] = src
    result[kept * 2 + 1] = tgt
    keptOriginal[kept] = edgeIdx
    if (keptSet) keptSet[edgeIdx] = 1
    kept++
  }

  // Compute sliderMaxIncoming from afterOutInDegree
  let sliderMaxIncoming = 0
  for (let i = 0; i < nodeCount; i++) {
    if (afterOutInDegree[i] > sliderMaxIncoming) sliderMaxIncoming = afterOutInDegree[i]
  }

  // Step 5: Add protected edges that weren't already kept
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

  // Compute final max degrees from the kept edges
  const finalResult = result.subarray(0, kept * 2)
  const finalOutDegree = new Uint32Array(nodeCount)
  const finalInDegree = new Uint32Array(nodeCount)
  for (let i = 0; i < kept; i++) {
    finalOutDegree[finalResult[i * 2]]++
    finalInDegree[finalResult[i * 2 + 1]]++
  }
  let finalMaxOutgoing = 0
  let finalMaxIncoming = 0
  for (let i = 0; i < nodeCount; i++) {
    if (finalOutDegree[i] > finalMaxOutgoing) finalMaxOutgoing = finalOutDegree[i]
    if (finalInDegree[i] > finalMaxIncoming) finalMaxIncoming = finalInDegree[i]
  }

  return {
    linkIndices: finalResult,
    keptEdgeIndices: keptOriginal.subarray(0, kept),
    sliderMaxOutgoing,
    sliderMaxIncoming,
    finalMaxOutgoing,
    finalMaxIncoming,
  }
}
