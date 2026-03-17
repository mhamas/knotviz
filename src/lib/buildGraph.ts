import Graph from 'graphology'
import { random } from 'graphology-layout'
import type { NullDefaultResult, PositionMode } from '../types'

/**
 * Converts validated, normalised GraphData into a Graphology MultiGraph.
 * Applies position-aware loading logic (all/partial/none positions).
 *
 * @param nullDefaultResult - The full result from applyNullDefaults.
 * @returns Object with the built graph and the detected position mode.
 * @example
 * const { graph, positionMode } = buildGraph(nullDefaultResult)
 */
export function buildGraph(nullDefaultResult: NullDefaultResult): {
  graph: Graph
  positionMode: PositionMode
} {
  const { data, defaultedByNode } = nullDefaultResult
  const graph = new Graph({ multi: true, type: 'directed' })

  // Determine position mode
  const nodesWithPositions = data.nodes.filter(
    (n) => typeof n.x === 'number' && typeof n.y === 'number'
  )
  let positionMode: PositionMode
  if (nodesWithPositions.length === data.nodes.length) {
    positionMode = 'all'
  } else if (nodesWithPositions.length > 0) {
    positionMode = 'partial'
  } else {
    positionMode = 'none'
  }

  const isUseInputPositions = positionMode === 'all'

  // Add nodes
  for (const node of data.nodes) {
    const attrs: Record<string, unknown> = {
      color: '#94a3b8',
      size: 5,
      label: node.label ?? node.id,
      _defaultedProperties: defaultedByNode.get(node.id) ?? [],
    }

    if (isUseInputPositions) {
      attrs.x = node.x
      attrs.y = node.y
    }

    if (node.properties) {
      for (const [key, value] of Object.entries(node.properties)) {
        attrs[key] = value
      }
    }

    graph.addNode(node.id, attrs)
  }

  // Randomise positions if not using input positions
  if (!isUseInputPositions) {
    random.assign(graph, { scale: 1, center: 0 })
  }

  // Add edges
  for (const edge of data.edges) {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) {
      console.warn(`Skipping edge ${edge.source} → ${edge.target}: unknown node id`)
      continue
    }
    const edgeAttrs: Record<string, unknown> = {
      color: '#94a3b8',
      size: 1,
    }
    if (edge.label) {
      edgeAttrs.label = edge.label
    }
    if (typeof edge.weight === 'number') {
      edgeAttrs.weight = edge.weight
    }
    graph.addEdge(edge.source, edge.target, edgeAttrs)
  }

  return { graph, positionMode }
}
