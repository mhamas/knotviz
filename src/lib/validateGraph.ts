import Ajv from 'ajv'
import type { GraphData, NodeInput, EdgeInput, PropertyValue } from '../types'
import graphSchema from './graphSchema.json'

/**
 * Structural schema for top-level validation via ajv. Checks that the
 * top-level shape is correct (version, nodes array, edges array) without
 * validating individual items — those are processed leniently below.
 */
const structuralSchema = {
  type: 'object',
  required: graphSchema.required,
  properties: {
    version: graphSchema.properties.version,
    nodes: { type: 'array', description: 'Array of node objects.' },
    edges: { type: 'array', description: 'Array of edge objects.' },
  },
}

const ajv = new Ajv({ allErrors: true })
const validateStructure = ajv.compile(structuralSchema)

/**
 * Validates a raw JS object against the graph JSON Schema.
 *
 * Phase 1: ajv validates top-level structure (version, nodes/edges arrays).
 * Phase 2: per-item lenient processing — invalid nodes/edges are skipped with warnings.
 *
 * Non-fatal skips (logged via console.warn, not thrown):
 * - Node missing `id` → skip node
 * - Edge referencing unknown node id → skip edge
 * - Property value of wrong type → treat as null
 *
 * @param raw - Parsed JSON value from parseJSON.
 * @returns Validated GraphData object.
 * @throws {Error} Schema validation failure — version, nodes, or edges issue.
 * @throws {Error} "Graph has no nodes to display" — zero valid nodes.
 * @example
 * const data = validateGraph(parseJSON(fileText))
 */
export function validateGraph(raw: unknown): GraphData {
  // Phase 1: structural validation via JSON Schema
  if (!validateStructure(raw)) {
    const errors = validateStructure.errors ?? []
    const first = errors[0]

    if (first?.keyword === 'const' && first.instancePath === '/version') {
      throw new Error('Unsupported schema version')
    }
    if (first?.keyword === 'required') {
      const missing = first.params?.missingProperty as string | undefined
      if (missing === 'version') {
        throw new Error('Unsupported schema version')
      }
      throw new Error('File must contain nodes and edges arrays')
    }
    // Fallback for type errors, missing fields, etc.
    throw new Error('File must contain nodes and edges arrays')
  }

  const obj = raw as Record<string, unknown>

  // Phase 2: lenient per-item processing
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
    if (typeof e.weight === 'number') {
      validEdge.weight = e.weight
    }
    validEdges.push(validEdge)
  }

  return {
    version: '1',
    nodes: validNodes,
    edges: validEdges,
  }
}
