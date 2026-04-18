import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { EdgeInput, GraphData, NodeInput, PropertyValue } from '../types'

interface GraphMLKey {
  id: string
  for: 'node' | 'edge' | 'graph' | 'all'
  attrName: string
  attrType: string
  defaultValue?: string
}

interface RawElement {
  [key: string]: unknown
}

const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  parseAttributeValue: false,
  textNodeName: '#text',
  isArray: (name: string) => ['node', 'edge', 'key', 'data', 'graph'].includes(name),
} as const

/**
 * Parse a GraphML document into GraphData. Supports the standard W3C-ish schema:
 * `<key>` declarations with `attr.name`/`attr.type` (int, long, float, double, boolean, string),
 * `<node>`/`<edge>` elements, per-element `<data>` values, and `<default>` fallback values.
 * Unknown element extensions (yEd styling, hyperedges, nested graphs, etc.) are ignored.
 *
 * Key mappings to structural NodeInput/EdgeInput fields:
 * - node key `label` → NodeInput.label
 * - node keys `x`, `y` (numeric) → NodeInput.x / NodeInput.y
 * - edge key `label` → EdgeInput.label
 * - edge key `weight` (numeric) → EdgeInput.weight
 *
 * @param xml - The raw GraphML document.
 * @returns A GraphData with `version: '1'`.
 * @throws If the XML is malformed or lacks the `<graphml>` root.
 */
export function parseGraphML(xml: string): GraphData {
  const validation = XMLValidator.validate(xml)
  if (validation !== true) throw new Error(`Malformed GraphML XML: ${validation.err.msg}`)

  const parser = new XMLParser(XML_PARSER_OPTIONS)
  let parsed: RawElement
  try {
    parsed = parser.parse(xml) as RawElement
  } catch (err) {
    throw new Error(`Failed to parse GraphML XML: ${(err as Error).message}`)
  }

  const root = parsed.graphml as RawElement | undefined
  if (!root) throw new Error('Missing <graphml> root element')

  const keys = collectKeys(root)
  const graphs = (root.graph as RawElement[] | undefined) ?? []
  if (graphs.length === 0) throw new Error('Missing <graph> element')
  if (graphs.length > 1) console.warn(`GraphML contains ${graphs.length} graphs; using the first`)

  const graph = graphs[0]
  const nodes = collectNodes(graph, keys)
  const knownIds = new Set(nodes.map((n) => n.id))
  const edges = collectEdges(graph, keys, knownIds)

  return { version: '1', nodes, edges }
}

function collectKeys(root: RawElement): Map<string, GraphMLKey> {
  const keys = new Map<string, GraphMLKey>()
  const rawKeys = (root.key as RawElement[] | undefined) ?? []
  for (const k of rawKeys) {
    const id = readAttr(k, '@_id')
    const forAttr = (readAttr(k, '@_for') ?? 'all') as GraphMLKey['for']
    const attrName = readAttr(k, '@_attr.name')
    const attrType = readAttr(k, '@_attr.type') ?? 'string'
    if (!id || !attrName) continue
    const key: GraphMLKey = { id, for: forAttr, attrName, attrType }
    const defaultRaw = k.default
    if (defaultRaw !== undefined) {
      key.defaultValue = extractText(defaultRaw)
    }
    keys.set(id, key)
  }
  return keys
}

function collectNodes(graph: RawElement, keys: Map<string, GraphMLKey>): NodeInput[] {
  const nodes: NodeInput[] = []
  const rawNodes = (graph.node as RawElement[] | undefined) ?? []
  for (const nodeEl of rawNodes) {
    const id = readAttr(nodeEl, '@_id')
    if (!id) {
      console.warn('GraphML: node missing id, skipping')
      continue
    }
    const node: NodeInput = { id }
    const properties: Record<string, PropertyValue | null> = {}
    const seenKeys = new Set<string>()
    const dataEls = (nodeEl.data as RawElement[] | undefined) ?? []

    for (const d of dataEls) {
      const keyRef = readAttr(d, '@_key') ?? ''
      const key = keys.get(keyRef)
      if (!key) {
        console.warn(`GraphML: <data> refers to unknown key "${keyRef}"`)
        continue
      }
      if (key.for !== 'node' && key.for !== 'all') {
        console.warn(`GraphML: key "${keyRef}" is not declared for nodes`)
        continue
      }
      const raw = extractText(d)
      seenKeys.add(key.id)
      applyNodeKeyValue(node, properties, key, raw)
    }

    for (const key of keys.values()) {
      if (key.for !== 'node' && key.for !== 'all') continue
      if (seenKeys.has(key.id)) continue
      if (key.defaultValue === undefined) continue
      applyNodeKeyValue(node, properties, key, key.defaultValue)
    }

    if (Object.keys(properties).length > 0) node.properties = properties
    nodes.push(node)
  }
  return nodes
}

function collectEdges(
  graph: RawElement,
  keys: Map<string, GraphMLKey>,
  knownIds: Set<string>,
): EdgeInput[] {
  const edges: EdgeInput[] = []
  const rawEdges = (graph.edge as RawElement[] | undefined) ?? []
  for (const edgeEl of rawEdges) {
    const source = readAttr(edgeEl, '@_source')
    const target = readAttr(edgeEl, '@_target')
    if (!source || !target) {
      console.warn('GraphML: edge missing source or target, skipping')
      continue
    }
    if (!knownIds.has(source) || !knownIds.has(target)) {
      console.warn(`GraphML: edge ${source} → ${target} references unknown node, skipping`)
      continue
    }
    const edge: EdgeInput = { source, target }
    const dataEls = (edgeEl.data as RawElement[] | undefined) ?? []
    for (const d of dataEls) {
      const keyRef = readAttr(d, '@_key') ?? ''
      const key = keys.get(keyRef)
      if (!key) continue
      if (key.for !== 'edge' && key.for !== 'all') continue
      const raw = extractText(d)
      if (key.attrName === 'label') {
        if (raw !== '') edge.label = raw
      } else if (key.attrName === 'weight') {
        const n = Number(raw)
        if (Number.isFinite(n)) edge.weight = n
      }
    }
    edges.push(edge)
  }
  return edges
}

function applyNodeKeyValue(
  node: NodeInput,
  properties: Record<string, PropertyValue | null>,
  key: GraphMLKey,
  raw: string,
): void {
  const typed = coerceByAttrType(raw, key.attrType)
  if (typed === undefined) return
  if (key.attrName === 'label' && typeof typed === 'string') {
    node.label = typed
    return
  }
  if (key.attrName === 'x' && typeof typed === 'number') {
    node.x = typed
    return
  }
  if (key.attrName === 'y' && typeof typed === 'number') {
    node.y = typed
    return
  }
  properties[key.attrName] = typed
}

function coerceByAttrType(raw: string, attrType: string): PropertyValue | undefined {
  if (raw === '') return undefined
  switch (attrType) {
    case 'int':
    case 'long':
    case 'float':
    case 'double': {
      const n = Number(raw)
      if (!Number.isFinite(n)) return undefined
      return n
    }
    case 'boolean': {
      const lower = raw.toLowerCase()
      if (lower === 'true' || raw === '1') return true
      if (lower === 'false' || raw === '0') return false
      return undefined
    }
    case 'string':
    default:
      return raw
  }
}

function readAttr(el: RawElement, attr: string): string | undefined {
  const v = el[attr]
  return v === undefined ? undefined : String(v)
}

function extractText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const text = (value as RawElement)['#text']
    if (text === undefined) return ''
    return String(text)
  }
  return ''
}
