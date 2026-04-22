import { downloadZip } from 'client-zip'
import { serializeStringArray } from '../formats'
import type { PropertyType } from '../../types'
import type { ExportNode, ExportResult, ExportSnapshot } from './types'
import { csvCell, csvRow } from './csvUtils'

/**
 * Serialise as a CSV nodes + edges pair — two files, zipped into one
 * download. `nodes.csv` carries `id`, `label`, `x`, `y`, and every declared
 * property column with a typed header suffix (`age:number`, `tags:string[]`).
 * `edges.csv` is the same shape as [CSV edge list](./csvEdgeList.ts).
 *
 * Typed headers are always emitted (even when inference would pick the same
 * type) so the round-trip is deterministic — no surprises on re-import.
 *
 * @param snapshot - The format-agnostic export snapshot.
 * @returns A Blob containing a ZIP with `nodes.csv` and `edges.csv` at the
 *   root. Filename extension is `.zip`.
 */
export async function exportAsCsvPair(snapshot: ExportSnapshot): Promise<ExportResult> {
  const nodesCsv = buildNodesCsv(snapshot)
  const edgesCsv = buildEdgesCsv(snapshot)
  const now = new Date()

  // client-zip accepts string inputs in browsers; wrapping as Uint8Array
  // keeps the Node / jsdom paths happy too (Blob-as-input stringifies to
  // "[object Blob]" in some shims, and bare strings require a WHATWG
  // ReadableStream).
  const encoder = new TextEncoder()
  const zip = await downloadZip([
    { name: 'nodes.csv', lastModified: now, input: encoder.encode(nodesCsv) },
    { name: 'edges.csv', lastModified: now, input: encoder.encode(edgesCsv) },
  ]).blob()

  return {
    blob: zip,
    extension: 'zip',
    description: 'Two CSVs (nodes + edges) zipped into a single download.',
  }
}

function buildNodesCsv(snapshot: ExportSnapshot): string {
  const hasLabel = snapshot.nodes.some((n) => n.label !== undefined)
  const hasPosition = snapshot.nodes.some((n) => n.x !== 0 || n.y !== 0)

  const header: string[] = ['id']
  if (hasLabel) header.push('label')
  if (hasPosition) {
    header.push('x', 'y')
  }
  for (const meta of snapshot.propertyMetas) {
    header.push(`${meta.key}:${meta.type}`)
  }

  const lines: string[] = [csvRow(header.map(csvCell))]
  for (const node of snapshot.nodes) {
    const cells: string[] = [csvCell(node.id)]
    if (hasLabel) cells.push(csvCell(node.label ?? ''))
    if (hasPosition) {
      cells.push(String(node.x), String(node.y))
    }
    for (const meta of snapshot.propertyMetas) {
      cells.push(csvCell(formatCell(node, meta.key, meta.type)))
    }
    lines.push(csvRow(cells))
  }
  return lines.join('')
}

function buildEdgesCsv(snapshot: ExportSnapshot): string {
  const hasAnyWeight = snapshot.edges.some((e) => e.weight !== undefined)
  const header = hasAnyWeight ? ['source', 'target', 'weight'] : ['source', 'target']
  const lines: string[] = [csvRow(header.map(csvCell))]
  for (const e of snapshot.edges) {
    const cells = [csvCell(e.source), csvCell(e.target)]
    if (hasAnyWeight) cells.push(e.weight !== undefined ? String(e.weight) : '')
    lines.push(csvRow(cells))
  }
  return lines.join('')
}

function formatCell(node: ExportNode, key: string, type: PropertyType): string {
  const v = node.properties[key]
  if (v === undefined || v === null) return ''
  switch (type) {
    case 'string[]':
      return serializeStringArray(Array.isArray(v) ? v : [String(v)])
    case 'boolean':
      return v === true ? 'true' : 'false'
    case 'number':
      return String(v)
    case 'date':
    case 'string':
      return String(v)
  }
}
