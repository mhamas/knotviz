import type { ExportResult, ExportSnapshot } from './types'
import { csvCell, csvRow } from './csvUtils'

/**
 * Serialise as a CSV edge list — a single file, one row per edge,
 * nodes implicit from source + target ids.
 *
 * **Lossy.** CSV edge list has no per-node properties; `age`, `tags`,
 * positions, labels — all lost on this path. The download dialog warns
 * before the user commits. If they need per-node data preserved, CSV
 * pair is the right choice.
 *
 * @param snapshot - The format-agnostic export snapshot.
 * @returns A Blob containing `source,target,weight` CSV text (RFC 4180,
 *   CRLF line endings for maximum compatibility).
 */
export function exportAsCsvEdgeList(snapshot: ExportSnapshot): ExportResult {
  const hasAnyWeight = snapshot.edges.some((e) => e.weight !== undefined)

  const lines: string[] = []
  lines.push(csvRow(hasAnyWeight ? ['source', 'target', 'weight'] : ['source', 'target']))

  for (const e of snapshot.edges) {
    const cells = [csvCell(e.source), csvCell(e.target)]
    if (hasAnyWeight) cells.push(e.weight !== undefined ? String(e.weight) : '')
    lines.push(csvRow(cells))
  }

  const blob = new Blob([lines.join('')], { type: 'text/csv;charset=utf-8' })
  return {
    blob,
    extension: 'csv',
    description: 'Edges only — per-node properties are dropped.',
  }
}
