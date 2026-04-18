import type { EdgeInput, GraphData, NodeInput } from '../types'
import { detectDelimiter, parseCSVRows } from './parseCSVRows'

/**
 * Parse a single-file CSV or TSV edge list into a GraphData. Expected columns (case-insensitive):
 * `source` and `target` (required), `weight` and `label` (optional). Extra columns are ignored.
 * Nodes are derived from the union of source and target ids, preserving first-appearance order.
 *
 * @param text - The raw CSV/TSV document.
 * @returns A GraphData with `version: '1'`.
 * @throws If the header is missing `source` or `target`, or if the document has no data rows.
 *
 * @example
 * parseEdgeListCSV('source,target,weight\na,b,0.5')
 * // → { version: '1', nodes: [{id:'a'},{id:'b'}], edges: [{source:'a',target:'b',weight:0.5}] }
 */
export function parseEdgeListCSV(text: string): GraphData {
  const firstNewline = text.search(/[\r\n]/)
  const firstLine = firstNewline === -1 ? text : text.slice(0, firstNewline)
  const delimiter = detectDelimiter(firstLine)
  const rows = parseCSVRows(text, delimiter)
  if (rows.length === 0) {
    throw new Error('Empty CSV: no header found')
  }
  if (rows.length < 2) {
    throw new Error('CSV contains only a header, no edges')
  }

  const header = rows[0].map((c) => c.trim().toLowerCase())
  const idxSource = header.indexOf('source')
  const idxTarget = header.indexOf('target')
  const idxWeight = header.indexOf('weight')
  const idxLabel = header.indexOf('label')

  if (idxSource === -1) throw new Error('CSV edge list must have a "source" column')
  if (idxTarget === -1) throw new Error('CSV edge list must have a "target" column')

  const edges: EdgeInput[] = []
  const nodeIds = new Map<string, NodeInput>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const source = row[idxSource] ?? ''
    const target = row[idxTarget] ?? ''
    if (source === '' || target === '') {
      console.warn(`Row ${i + 1}: missing source or target, skipping`)
      continue
    }
    if (!nodeIds.has(source)) nodeIds.set(source, { id: source })
    if (!nodeIds.has(target)) nodeIds.set(target, { id: target })

    const edge: EdgeInput = { source, target }
    if (idxWeight !== -1) {
      const raw = row[idxWeight] ?? ''
      if (raw !== '') {
        const n = Number(raw)
        if (Number.isFinite(n)) edge.weight = n
        else console.warn(`Row ${i + 1}: non-numeric weight "${raw}", dropping weight`)
      }
    }
    if (idxLabel !== -1) {
      const raw = row[idxLabel] ?? ''
      if (raw !== '') edge.label = raw
    }
    edges.push(edge)
  }

  return {
    version: '1',
    nodes: Array.from(nodeIds.values()),
    edges,
  }
}
