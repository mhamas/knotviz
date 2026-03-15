import type { GraphData, NodeInput, EdgeInput, PropertyValue } from '../types'

/**
 * Validates a raw JS object against the versioned graph schema.
 *
 * Non-fatal skips (logged via console.warn, not thrown):
 * - Node missing `id` → skip node
 * - Edge referencing unknown node id → skip edge
 * - Property value of wrong type → treat as null
 *
 * @param raw - Parsed JSON value from parseJSON.
 * @returns Validated GraphData object.
 * @throws {Error} "Unsupported schema version" — missing or wrong version.
 * @throws {Error} "File must contain nodes and edges arrays" — missing or non-array nodes/edges.
 * @throws {Error} "Graph has no nodes to display" — zero valid nodes.
 * @example
 * const data = validateGraph(parseJSON(fileText))
 */
export function validateGraph(raw: unknown): GraphData {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('File must contain nodes and edges arrays')
  }

  const obj = raw as Record<string, unknown>

  if (!('version' in obj) || obj.version !== '1') {
    throw new Error('Unsupported schema version')
  }

  if (!('nodes' in obj) || !('edges' in obj) || !Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
    throw new Error('File must contain nodes and edges arrays')
  }

  const validNodes: NodeInput[] = []
  for (const node of obj.nodes as unknown[]) {
    if (typeof node !== 'object' || node === null) {
      console.warn('Skipping invalid node: not an object')
      continue
    }
    const n = node as Record<string, unknown>
    if (typeof n.id !== 'string' || n.id === '') {
      console.warn('Skipping node without valid string id')
      continue
    }

    const validNode: NodeInput = { id: n.id }

    if (typeof n.label === 'string') {
      validNode.label = n.label
    }
    if (typeof n.x === 'number') {
      validNode.x = n.x
    }
    if (typeof n.y === 'number') {
      validNode.y = n.y
    }

    if (typeof n.properties === 'object' && n.properties !== null && !Array.isArray(n.properties)) {
      const props: Record<string, PropertyValue> = {}
      for (const [key, value] of Object.entries(n.properties as Record<string, unknown>)) {
        if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
          props[key] = value
        } else {
          console.warn(`Skipping property "${key}" on node "${n.id}": unsupported type`)
        }
      }
      validNode.properties = props
    }

    validNodes.push(validNode)
  }

  if (validNodes.length === 0) {
    throw new Error('Graph has no nodes to display')
  }

  const nodeIds = new Set(validNodes.map((n) => n.id))
  const validEdges: EdgeInput[] = []
  for (const edge of obj.edges as unknown[]) {
    if (typeof edge !== 'object' || edge === null) {
      console.warn('Skipping invalid edge: not an object')
      continue
    }
    const e = edge as Record<string, unknown>
    if (typeof e.source !== 'string' || typeof e.target !== 'string') {
      console.warn('Skipping edge: missing source or target')
      continue
    }
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
      console.warn(`Skipping edge ${e.source} → ${e.target}: unknown node id`)
      continue
    }

    const validEdge: EdgeInput = { source: e.source, target: e.target }
    if (typeof e.label === 'string') {
      validEdge.label = e.label
    }
    validEdges.push(validEdge)
  }

  return {
    version: '1',
    nodes: validNodes,
    edges: validEdges,
  }
}
