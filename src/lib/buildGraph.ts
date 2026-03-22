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

  // Build nodeId → index map
  const nodeIndexMap = new Map<string, number>()
  for (let i = 0; i < data.nodes.length; i++) {
    nodeIndexMap.set(data.nodes[i].id, i)
  }

  // Determine position mode
  const nodesWithPositions = data.nodes.filter(
    (n) => typeof n.x === 'number' && typeof n.y === 'number',
  )
  let positionMode: PositionMode
  if (nodesWithPositions.length === data.nodes.length) {
    positionMode = 'all'
  } else if (nodesWithPositions.length > 0) {
    positionMode = 'partial'
  } else {
    positionMode = 'none'
  }

  // Build initial positions Float32Array (only when all nodes have positions)
  let initialPositions: Float32Array | undefined
  if (positionMode === 'all') {
    initialPositions = new Float32Array(data.nodes.length * 2)
    for (let i = 0; i < data.nodes.length; i++) {
      initialPositions[i * 2] = data.nodes[i].x!
      initialPositions[i * 2 + 1] = data.nodes[i].y!
    }
  }

  // Build link indices (skip edges referencing unknown nodes) and adjacency
  const adjacency = new Map<string, Set<string>>()
  const nodeEdgeIndices = new Map<string, Set<number>>()
  for (const node of data.nodes) {
    adjacency.set(node.id, new Set())
    nodeEdgeIndices.set(node.id, new Set())
  }

  const validEdgeIndices: number[] = []
  for (let i = 0; i < data.edges.length; i++) {
    const edge = data.edges[i]
    const srcIdx = nodeIndexMap.get(edge.source)
    const tgtIdx = nodeIndexMap.get(edge.target)
    if (srcIdx === undefined || tgtIdx === undefined) {
      console.warn(`Skipping edge ${edge.source} → ${edge.target}: unknown node id`)
      continue
    }
    validEdgeIndices.push(srcIdx, tgtIdx)

    // Adjacency (undirected for neighbor highlighting)
    adjacency.get(edge.source)!.add(edge.target)
    adjacency.get(edge.target)!.add(edge.source)

    const edgeIdx = validEdgeIndices.length / 2 - 1
    nodeEdgeIndices.get(edge.source)!.add(edgeIdx)
    nodeEdgeIndices.get(edge.target)!.add(edgeIdx)
  }

  const linkIndices = new Float32Array(validEdgeIndices)

  return {
    nodes: data.nodes,
    edges: data.edges,
    nodeIndexMap,
    initialPositions,
    linkIndices,
    adjacency,
    nodeEdgeIndices,
    positionMode,
    defaultedByNode,
  }
}
