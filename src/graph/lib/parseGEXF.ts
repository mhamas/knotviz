import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { EdgeInput, GraphData, NodeInput, PropertyValue } from '../types'
import { splitStringArray } from './formats'

interface GEXFAttribute {
  id: string
  title: string
  type: string
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
  removeNSPrefix: true,
  isArray: (name: string) =>
    ['node', 'edge', 'attribute', 'attvalue', 'attributes', 'graph'].includes(name),
} as const

/**
 * Parse a GEXF 1.3 static document into GraphData. Supports:
 * - `<attributes class="node|edge">` with typed `<attribute>` declarations (integer, long,
 *   float, double, boolean, string, anyURI, liststring)
 * - `<node id="..." label="...">` with `<attvalues>` children referencing attribute ids
 * - `<edge source="..." target="..." weight="..." label="...">` (element attributes take
 *   priority; attvalues for weight/label are read as fallback)
 * - `<viz:position x="..." y="..."/>` for structural node coordinates (z is ignored)
 * - `<default>` fallback values on attribute declarations
 *
 * Out of scope for v1: dynamic mode / `<spells>`, viz:color, viz:size, viz:shape, nested
 * hierarchies. A file with multiple graphs uses the first and warns.
 *
 * @param xml - The raw GEXF document.
 * @returns A GraphData with `version: '1'`.
 * @throws If the XML is malformed or lacks the `<gexf>` root.
 */
export function parseGEXF(xml: string): GraphData {
  const validation = XMLValidator.validate(xml)
  if (validation !== true) throw new Error(`Malformed GEXF XML: ${validation.err.msg}`)

  const parser = new XMLParser(XML_PARSER_OPTIONS)
  let parsed: RawElement
  try {
    parsed = parser.parse(xml) as RawElement
  } catch (err) {
    throw new Error(`Failed to parse GEXF XML: ${(err as Error).message}`)
  }

  const root = parsed.gexf as RawElement | undefined
  if (!root) throw new Error('Missing <gexf> root element')

  const graphs = (root.graph as RawElement[] | undefined) ?? []
  if (graphs.length === 0) throw new Error('Missing <graph> element')
  if (graphs.length > 1) console.warn(`GEXF contains ${graphs.length} graphs; using the first`)
  const graph = graphs[0]

  const { nodeAttrs, edgeAttrs } = collectAttributeDeclarations(graph)
  const nodes = collectNodes(graph, nodeAttrs)
  const knownIds = new Set(nodes.map((n) => n.id))
  const edges = collectEdges(graph, edgeAttrs, knownIds)

  return { version: '1', nodes, edges }
}

function collectAttributeDeclarations(graph: RawElement): {
  nodeAttrs: Map<string, GEXFAttribute>
  edgeAttrs: Map<string, GEXFAttribute>
} {
  const nodeAttrs = new Map<string, GEXFAttribute>()
  const edgeAttrs = new Map<string, GEXFAttribute>()
  const attributeSets = (graph.attributes as RawElement[] | undefined) ?? []
  for (const attrs of attributeSets) {
    const cls = readAttr(attrs, '@_class')
    const target = cls === 'edge' ? edgeAttrs : nodeAttrs
    const list = (attrs.attribute as RawElement[] | undefined) ?? []
    for (const a of list) {
      const id = readAttr(a, '@_id')
      const title = readAttr(a, '@_title')
      const type = readAttr(a, '@_type') ?? 'string'
      if (!id || !title) continue
      const attr: GEXFAttribute = { id, title, type }
      if (a.default !== undefined) attr.defaultValue = extractText(a.default)
      target.set(id, attr)
    }
  }
  return { nodeAttrs, edgeAttrs }
}

function collectNodes(graph: RawElement, nodeAttrs: Map<string, GEXFAttribute>): NodeInput[] {
  const nodesContainer = graph.nodes as RawElement | undefined
  const rawNodes = (nodesContainer?.node as RawElement[] | undefined) ?? []
  const nodes: NodeInput[] = []

  for (const nodeEl of rawNodes) {
    const id = readAttr(nodeEl, '@_id')
    if (!id) {
      console.warn('GEXF: node missing id, skipping')
      continue
    }
    const node: NodeInput = { id }

    const label = readAttr(nodeEl, '@_label')
    if (label !== undefined && label !== '') node.label = label

    const position = nodeEl.position as RawElement | undefined
    if (position) {
      const x = readAttr(position, '@_x')
      const y = readAttr(position, '@_y')
      if (x !== undefined) {
        const n = Number(x)
        if (Number.isFinite(n)) node.x = n
      }
      if (y !== undefined) {
        const n = Number(y)
        if (Number.isFinite(n)) node.y = n
      }
    }

    const properties: Record<string, PropertyValue | null> = {}
    const avContainer = nodeEl.attvalues as RawElement | undefined
    const rawAttvalues = (avContainer?.attvalue as RawElement[] | undefined) ?? []
    const seenAttrs = new Set<string>()

    for (const av of rawAttvalues) {
      const forId = readAttr(av, '@_for') ?? ''
      const value = readAttr(av, '@_value') ?? ''
      const attr = nodeAttrs.get(forId)
      if (!attr) {
        console.warn(`GEXF: attvalue refers to unknown attribute "${forId}"`)
        continue
      }
      seenAttrs.add(attr.id)
      const typed = coerceByGEXFType(value, attr.type)
      if (typed === undefined) continue
      properties[attr.title] = typed
    }

    for (const attr of nodeAttrs.values()) {
      if (seenAttrs.has(attr.id)) continue
      if (attr.defaultValue === undefined) continue
      const typed = coerceByGEXFType(attr.defaultValue, attr.type)
      if (typed === undefined) continue
      properties[attr.title] = typed
    }

    if (Object.keys(properties).length > 0) node.properties = properties
    nodes.push(node)
  }
  return nodes
}

function collectEdges(
  graph: RawElement,
  edgeAttrs: Map<string, GEXFAttribute>,
  knownIds: Set<string>,
): EdgeInput[] {
  const edgesContainer = graph.edges as RawElement | undefined
  const rawEdges = (edgesContainer?.edge as RawElement[] | undefined) ?? []
  const edges: EdgeInput[] = []

  for (const edgeEl of rawEdges) {
    const source = readAttr(edgeEl, '@_source')
    const target = readAttr(edgeEl, '@_target')
    if (!source || !target) {
      console.warn('GEXF: edge missing source or target, skipping')
      continue
    }
    if (!knownIds.has(source) || !knownIds.has(target)) {
      console.warn(`GEXF: edge ${source} → ${target} references unknown node, skipping`)
      continue
    }
    const edge: EdgeInput = { source, target }

    const weightAttr = readAttr(edgeEl, '@_weight')
    if (weightAttr !== undefined) {
      const n = Number(weightAttr)
      if (Number.isFinite(n)) edge.weight = n
    }
    const labelAttr = readAttr(edgeEl, '@_label')
    if (labelAttr !== undefined && labelAttr !== '') edge.label = labelAttr

    const avContainer = edgeEl.attvalues as RawElement | undefined
    const rawAttvalues = (avContainer?.attvalue as RawElement[] | undefined) ?? []
    for (const av of rawAttvalues) {
      const forId = readAttr(av, '@_for') ?? ''
      const value = readAttr(av, '@_value') ?? ''
      const attr = edgeAttrs.get(forId)
      if (!attr) continue
      if (attr.title === 'weight' && edge.weight === undefined) {
        const n = Number(value)
        if (Number.isFinite(n)) edge.weight = n
      } else if (attr.title === 'label' && edge.label === undefined && value !== '') {
        edge.label = value
      }
    }

    edges.push(edge)
  }
  return edges
}

function coerceByGEXFType(raw: string, type: string): PropertyValue | undefined {
  if (raw === '') return undefined
  switch (type) {
    case 'integer':
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
    case 'liststring':
      return splitStringArray(raw)
    case 'string':
    case 'anyURI':
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
