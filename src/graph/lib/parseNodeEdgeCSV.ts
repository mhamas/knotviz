import type { EdgeInput, GraphData, NodeInput, ParseOptions, PropertyType, PropertyValue } from '../types'
import {
  inferColumnType,
  parseTypedCell,
  parseTypedHeader,
  type TypedHeader,
} from './formats'
import { detectDelimiter, parseCSVRows } from './parseCSVRows'

interface PropertyColumnSpec {
  name: string
  columnIndex: number
  type: PropertyType
}

interface StructuralIndices {
  idIdx: number
  labelIdx: number
  xIdx: number
  yIdx: number
}

/**
 * Parse a CSV pair (nodes + edges) into a GraphData.
 *
 * **Nodes CSV columns** (case-insensitive): `id` (required); `label`, `x`, `y` (optional).
 * Any other column becomes a per-node property, with an optional `:type` suffix on the header
 * declaring the property type (`number`, `string`, `boolean`, `date`, `string[]`). Columns
 * without a type suffix are inferred from their sample values; `string[]` is never inferred
 * and requires the explicit `:string[]` suffix.
 *
 * **Edges CSV columns** (case-insensitive): `source` and `target` (required); `weight` and
 * `label` (optional). Edges referencing ids not present in the nodes CSV are dropped with a
 * console warning.
 *
 * Both files may use commas or tabs as delimiters; the delimiter is autodetected per file.
 *
 * @param nodesText - The raw nodes CSV/TSV document.
 * @param edgesText - The raw edges CSV/TSV document.
 * @returns A GraphData with `version: '1'`.
 * @throws If the nodes CSV lacks an `id` column, or the edges CSV lacks `source`/`target`.
 *
 * @example
 * const nodes = 'id,age:number\nn1,34\nn2,28'
 * const edges = 'source,target\nn1,n2'
 * parseNodeEdgeCSV(nodes, edges)
 */
export function parseNodeEdgeCSV(
  nodesText: string,
  edgesText: string,
  options?: ParseOptions,
): GraphData {
  const nodes = parseNodesCSV(nodesText, options)
  const knownIds = new Set(nodes.map((n) => n.id))
  const edges = parseEdgesCSV(edgesText, knownIds)
  return { version: '1', nodes, edges }
}

function parseNodesCSV(text: string, options?: ParseOptions): NodeInput[] {
  const firstLine = text.split(/[\r\n]/, 1)[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const rows = parseCSVRows(text, delimiter)
  if (rows.length === 0) throw new Error('Empty nodes CSV: no header found')

  const headerCells = rows[0]
  const headers: TypedHeader[] = headerCells.map((h) => parseTypedHeader(h))
  const lowerNames = headers.map((h) => h.name.toLowerCase())

  const structural: StructuralIndices = {
    idIdx: lowerNames.indexOf('id'),
    labelIdx: lowerNames.indexOf('label'),
    xIdx: lowerNames.indexOf('x'),
    yIdx: lowerNames.indexOf('y'),
  }
  if (structural.idIdx === -1) throw new Error('Nodes CSV must have an "id" column')

  const dataRows = rows.slice(1)

  const propertyColumns: PropertyColumnSpec[] = []
  for (let i = 0; i < headers.length; i++) {
    // `id`, `x`, `y` are structural-only — they're consumed as the graph's
    // identifier and coordinates, not surfaced as filterable properties.
    // `label` is a special case: it's used as the display label, but we ALSO
    // expose it as a property so users can filter / colour / group by it
    // (otherwise a CSV that uses `label` as a real data column loses it).
    if (i === structural.idIdx || i === structural.xIdx || i === structural.yIdx) {
      continue
    }
    const header = headers[i]
    const type =
      header.type ?? inferColumnType(dataRows.map((row) => row[i] ?? ''))
    propertyColumns.push({ name: header.name, columnIndex: i, type })
  }

  const nodes: NodeInput[] = []
  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r]
    const id = (row[structural.idIdx] ?? '').trim()
    if (id === '') {
      console.warn(`Nodes CSV row ${r + 2}: missing id, skipping`)
      continue
    }
    const node: NodeInput = { id }
    if (structural.labelIdx !== -1) {
      const v = row[structural.labelIdx] ?? ''
      if (v !== '') node.label = v
    }
    if (structural.xIdx !== -1) {
      const raw = row[structural.xIdx] ?? ''
      if (raw !== '') {
        const n = Number(raw)
        if (Number.isFinite(n)) node.x = n
      }
    }
    if (structural.yIdx !== -1) {
      const raw = row[structural.yIdx] ?? ''
      if (raw !== '') {
        const n = Number(raw)
        if (Number.isFinite(n)) node.y = n
      }
    }
    if (propertyColumns.length > 0) {
      const properties: Record<string, PropertyValue | null> = {}
      for (const spec of propertyColumns) {
        const raw = row[spec.columnIndex] ?? ''
        let coerced: PropertyValue | undefined
        try {
          coerced = parseTypedCell(raw, spec.type)
        } catch (err) {
          const message = (err as Error).message
          console.warn(`Nodes CSV row ${r + 2}: ${message} for property "${spec.name}"`)
          options?.onWarning?.({
            scope: 'nodes',
            kind: 'coercion',
            propertyKey: spec.name,
            row: r + 2,
            value: raw,
            message,
          })
          coerced = undefined
        }
        if (coerced !== undefined) properties[spec.name] = coerced
      }
      if (Object.keys(properties).length > 0) node.properties = properties
    }
    nodes.push(node)
  }

  // Preserve declared-but-empty columns: if a property column had a header but
  // every data cell was empty, ensure the key still appears (as null) on every
  // node so detectPropertyTypes picks it up and applyNullDefaults fills it with
  // the type default. Without this, the column vanishes entirely and the UI
  // has no record that it was declared.
  const columnHasValue = new Map<string, boolean>()
  for (const spec of propertyColumns) columnHasValue.set(spec.name, false)
  for (const node of nodes) {
    if (!node.properties) continue
    for (const key of Object.keys(node.properties)) {
      columnHasValue.set(key, true)
    }
  }
  for (const [key, hasValue] of columnHasValue) {
    if (hasValue) continue
    for (const node of nodes) {
      if (!node.properties) node.properties = {}
      node.properties[key] = null
    }
  }

  return nodes
}

function parseEdgesCSV(text: string, knownIds: Set<string>): EdgeInput[] {
  const firstLine = text.split(/[\r\n]/, 1)[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const rows = parseCSVRows(text, delimiter)
  if (rows.length === 0) throw new Error('Empty edges CSV: no header found')

  const header = rows[0].map((c) => c.trim().toLowerCase())
  const idxSource = header.indexOf('source')
  const idxTarget = header.indexOf('target')
  const idxWeight = header.indexOf('weight')
  const idxLabel = header.indexOf('label')
  if (idxSource === -1) throw new Error('Edges CSV must have a "source" column')
  if (idxTarget === -1) throw new Error('Edges CSV must have a "target" column')

  const edges: EdgeInput[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const source = row[idxSource] ?? ''
    const target = row[idxTarget] ?? ''
    if (source === '' || target === '') {
      console.warn(`Edges CSV row ${i + 1}: missing source or target, skipping`)
      continue
    }
    if (!knownIds.has(source) || !knownIds.has(target)) {
      console.warn(`Edges CSV row ${i + 1}: unknown node id in edge ${source} → ${target}, skipping`)
      continue
    }
    const edge: EdgeInput = { source, target }
    if (idxWeight !== -1) {
      const raw = row[idxWeight] ?? ''
      if (raw !== '') {
        const n = Number(raw)
        if (Number.isFinite(n)) edge.weight = n
        else console.warn(`Edges CSV row ${i + 1}: non-numeric weight "${raw}", dropping weight`)
      }
    }
    if (idxLabel !== -1) {
      const raw = row[idxLabel] ?? ''
      if (raw !== '') edge.label = raw
    }
    edges.push(edge)
  }
  return edges
}
