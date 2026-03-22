import Ajv from 'ajv'
import type { GraphData, NodeInput, EdgeInput } from '../types'
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
  // Validates in-place where possible — only creates new arrays when items are skipped.
  const rawNodes = obj.nodes as unknown[]
  const rawEdges = obj.edges as unknown[]

  let skippedNodes = 0
  let skippedEdges = 0
  const validNodes: NodeInput[] = []

  for (let i = 0; i < rawNodes.length; i++) {
    const node = rawNodes[i]
    if (typeof node !== 'object' || node === null) {
      skippedNodes++
      continue
    }
    const n = node as Record<string, unknown>
    if (typeof n.id !== 'string' || n.id === '') {
      skippedNodes++
      continue
    }

    // Validate properties in-place — strip unsupported types without copying
    if (typeof n.properties === 'object' && n.properties !== null && !Array.isArray(n.properties)) {
      const props = n.properties as Record<string, unknown>
      for (const key of Object.keys(props)) {
        const value = props[key]
        if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'boolean') {
          delete props[key]
          skippedNodes++ // count as a warning (batched below)
        }
      }
    }

    // Cast in-place — avoid creating new NodeInput objects
    validNodes.push(node as unknown as NodeInput)
  }

  if (skippedNodes > 0) {
    console.warn(`Skipped ${skippedNodes} invalid nodes or property values`)
  }

  if (validNodes.length === 0) {
    throw new Error('Graph has no nodes to display')
  }

  // Build node ID set for edge validation
  const nodeIds = new Set<string>()
  for (let i = 0; i < validNodes.length; i++) {
    nodeIds.add(validNodes[i].id)
  }

  const validEdges: EdgeInput[] = []
  for (let i = 0; i < rawEdges.length; i++) {
    const edge = rawEdges[i]
    if (typeof edge !== 'object' || edge === null) {
      skippedEdges++
      continue
    }
    const e = edge as Record<string, unknown>
    if (typeof e.source !== 'string' || typeof e.target !== 'string') {
      skippedEdges++
      continue
    }
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
      skippedEdges++
      continue
    }
    // Cast in-place
    validEdges.push(edge as unknown as EdgeInput)
  }

  if (skippedEdges > 0) {
    console.warn(`Skipped ${skippedEdges} invalid edges`)
  }

  return {
    version: '1',
    // If nothing was skipped, reuse original arrays (no copy)
    nodes: skippedNodes === 0 ? (rawNodes as NodeInput[]) : validNodes,
    edges: skippedEdges === 0 ? (rawEdges as EdgeInput[]) : validEdges,
  }
}
