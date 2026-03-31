import type { CosmosGraphData, NullDefaultResult, PositionMode } from '../types'

/**
 * Converts validated, normalised GraphData into a CosmosGraphData structure
 * optimised for @cosmos.gl/graph (Float32Arrays, index maps).
 *
 * NOTE: The loading worker (loadingWorker.ts) builds CosmosGraphData
 * incrementally for large files. This function is used by unit tests
 * and as a reference implementation.
 *
 * @param nullDefaultResult - The full result from applyNullDefaults.
 * @returns CosmosGraphData ready for the Cosmos renderer.
 * @example
 * const cosmosData = buildGraph(nullDefaultResult)
 */
export function buildGraph(nullDefaultResult: NullDefaultResult): CosmosGraphData {
  const { data } = nullDefaultResult
  const nodeCount = data.nodes.length
  const edgeCount = data.edges.length

  // Build compact stores
  const nodeIds: string[] = []
  const nodeLabels: (string | undefined)[] = []
  const nodeIndexMap = new Map<string, number>()

  for (let i = 0; i < nodeCount; i++) {
    const node = data.nodes[i]
    nodeIds.push(node.id)
    nodeLabels.push(node.label)
    nodeIndexMap.set(node.id, i)
  }

  // Determine position mode
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

  // Build initial positions
  let initialPositions: Float32Array | undefined
  if (positionMode === 'all') {
    initialPositions = new Float32Array(nodeCount * 2)
    for (let i = 0; i < nodeCount; i++) {
      initialPositions[i * 2] = data.nodes[i].x!
      initialPositions[i * 2 + 1] = data.nodes[i].y!
    }
  }

  // Build link indices + edge stores
  const linkIndices = new Float32Array(edgeCount * 2)
  const edgeSources = new Uint32Array(edgeCount)
  const edgeTargets = new Uint32Array(edgeCount)
  const edgeLabelsList: (string | undefined)[] = []
  const edgeWeightsList: number[] = []
  let hasAnyWeight = false
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
    linkIndices[validEdgeCount * 2] = srcIdx
    linkIndices[validEdgeCount * 2 + 1] = tgtIdx
    edgeSources[validEdgeCount] = srcIdx
    edgeTargets[validEdgeCount] = tgtIdx
    edgeLabelsList.push(edge.label)
    if (typeof edge.weight === 'number') {
      edgeWeightsList.push(edge.weight)
      hasAnyWeight = true
    } else {
      edgeWeightsList.push(0)
    }
    validEdgeCount++
  }

  if (skippedEdges > 0) {
    console.warn(`Skipped ${skippedEdges} edges referencing unknown node ids`)
  }

  const finalLinkIndices = skippedEdges > 0 ? linkIndices.subarray(0, validEdgeCount * 2) : linkIndices
  const finalEdgeSources = skippedEdges > 0 ? edgeSources.subarray(0, validEdgeCount) : edgeSources
  const finalEdgeTargets = skippedEdges > 0 ? edgeTargets.subarray(0, validEdgeCount) : edgeTargets
  const edgeWeights = hasAnyWeight ? new Float32Array(edgeWeightsList) : undefined

  // Pre-sort edge indices by weight descending (for edge filtering sliders)
  const edgeSortOrder = new Uint32Array(validEdgeCount)
  for (let i = 0; i < validEdgeCount; i++) edgeSortOrder[i] = i
  if (edgeWeights) {
    edgeSortOrder.sort((a, b) => edgeWeights[b] - edgeWeights[a])
  }

  // Compute max degree (max edges touching any single node)
  const degree = new Uint32Array(nodeCount)
  for (let i = 0; i < validEdgeCount; i++) {
    degree[finalEdgeSources[i]]++
    degree[finalEdgeTargets[i]]++
  }
  let maxDegree = 0
  for (let i = 0; i < nodeCount; i++) {
    if (degree[i] > maxDegree) maxDegree = degree[i]
  }

  return {
    nodeCount,
    nodeIds,
    nodeLabels,
    nodeIndexMap,
    initialPositions,
    linkIndices: finalLinkIndices,
    positionMode,
    edgeSources: finalEdgeSources,
    edgeTargets: finalEdgeTargets,
    edgeLabels: edgeLabelsList,
    edgeWeights,
    edgeSortOrder,
    maxDegree,
  }
}
