import type { CosmosGraphData, NullDefaultResult, PositionMode } from '../types'

/**
 * Converts validated, normalised GraphData into a CosmosGraphData structure
 * optimised for @cosmos.gl/graph (Float32Arrays, index maps, adjacency).
 *
 * @param nullDefaultResult - The full result from applyNullDefaults.
 * @returns CosmosGraphData ready for the Cosmos renderer.
 * @example
 * const cosmosData = buildGraph(nullDefaultResult)
 */
export function buildGraph(nullDefaultResult: NullDefaultResult): CosmosGraphData {
  const { data, defaultedByNode } = nullDefaultResult
  const nodeCount = data.nodes.length
  const edgeCount = data.edges.length

  // Build nodeId → index map
  const nodeIndexMap = new Map<string, number>()
  for (let i = 0; i < nodeCount; i++) {
    nodeIndexMap.set(data.nodes[i].id, i)
  }

  // Determine position mode (loop instead of .filter() to avoid temp array)
  let nodesWithPositions = 0
  for (let i = 0; i < nodeCount; i++) {
    if (typeof data.nodes[i].x === 'number' && typeof data.nodes[i].y === 'number') {
      nodesWithPositions++
    }
  }
  let positionMode: PositionMode
  if (nodesWithPositions === nodeCount) {
    positionMode = 'all'
  } else if (nodesWithPositions > 0) {
    positionMode = 'partial'
  } else {
    positionMode = 'none'
  }

  // Build initial positions Float32Array (only when all nodes have positions)
  let initialPositions: Float32Array | undefined
  if (positionMode === 'all') {
    initialPositions = new Float32Array(nodeCount * 2)
    for (let i = 0; i < nodeCount; i++) {
      initialPositions[i * 2] = data.nodes[i].x!
      initialPositions[i * 2 + 1] = data.nodes[i].y!
    }
  }

  // Build link indices and adjacency in a single pass.
  // Pre-allocate linkIndices at max size, then trim if edges were skipped.
  const linkIndices = new Float32Array(edgeCount * 2)
  const adjacency = new Map<string, Set<string>>()
  const nodeEdgeIndices = new Map<string, Set<number>>()

  // Lazily initialise adjacency sets — only create when first edge touches a node.
  // This avoids creating 1M empty Sets upfront.
  let validEdgeCount = 0
  let skippedEdges = 0
  for (let i = 0; i < edgeCount; i++) {
    const edge = data.edges[i]
    const srcIdx = nodeIndexMap.get(edge.source)
    const tgtIdx = nodeIndexMap.get(edge.target)
    if (srcIdx === undefined || tgtIdx === undefined) {
      skippedEdges++
      continue
    }

    const offset = validEdgeCount * 2
    linkIndices[offset] = srcIdx
    linkIndices[offset + 1] = tgtIdx

    // Adjacency (lazy init)
    let srcAdj = adjacency.get(edge.source)
    if (!srcAdj) { srcAdj = new Set(); adjacency.set(edge.source, srcAdj) }
    srcAdj.add(edge.target)

    let tgtAdj = adjacency.get(edge.target)
    if (!tgtAdj) { tgtAdj = new Set(); adjacency.set(edge.target, tgtAdj) }
    tgtAdj.add(edge.source)

    let srcEdges = nodeEdgeIndices.get(edge.source)
    if (!srcEdges) { srcEdges = new Set(); nodeEdgeIndices.set(edge.source, srcEdges) }
    srcEdges.add(validEdgeCount)

    let tgtEdges = nodeEdgeIndices.get(edge.target)
    if (!tgtEdges) { tgtEdges = new Set(); nodeEdgeIndices.set(edge.target, tgtEdges) }
    tgtEdges.add(validEdgeCount)

    validEdgeCount++
  }

  if (skippedEdges > 0) {
    console.warn(`Skipped ${skippedEdges} edges referencing unknown node ids`)
  }

  // Trim if edges were skipped
  const finalLinkIndices = skippedEdges > 0
    ? linkIndices.subarray(0, validEdgeCount * 2)
    : linkIndices

  return {
    nodes: data.nodes,
    edges: data.edges,
    nodeIndexMap,
    initialPositions,
    linkIndices: finalLinkIndices,
    adjacency,
    nodeEdgeIndices,
    positionMode,
    defaultedByNode,
  }
}
