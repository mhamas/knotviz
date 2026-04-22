import type { ExportFormat, ExportResult, ExportSnapshot } from './types'
import { exportAsJson } from './json'
import { exportAsCsvEdgeList } from './csvEdgeList'
import { exportAsCsvPair } from './csvPair'
import { exportAsGraphML } from './graphml'
import { exportAsGexf } from './gexf'

/**
 * Format metadata for UI consumers (the download split-button dropdown).
 * Keeping this next to the dispatcher so adding a new format only touches
 * one file: define the serializer, register it in the switch, add an
 * entry here.
 */
export const EXPORT_FORMATS: { format: ExportFormat; label: string; description: string; lossy: boolean }[] = [
  { format: 'json', label: 'JSON', description: 'Lossless round-trip.', lossy: false },
  { format: 'csv-edge-list', label: 'CSV edge list', description: 'Edges only — per-node properties are dropped.', lossy: true },
  { format: 'csv-pair', label: 'CSV nodes + edges (ZIP)', description: 'Two CSVs, zipped.', lossy: false },
  { format: 'graphml', label: 'GraphML', description: 'Arrays flatten to pipe-delimited strings.', lossy: true },
  { format: 'gexf', label: 'GEXF', description: 'Preserves arrays and positions.', lossy: false },
]

/**
 * Dispatches to the correct serializer for the requested format.
 *
 * Async because CSV pair goes through `client-zip`; other paths resolve
 * synchronously but share the same shape.
 */
export async function exportSnapshot(
  snapshot: ExportSnapshot,
  format: ExportFormat,
): Promise<ExportResult> {
  switch (format) {
    case 'json':
      return exportAsJson(snapshot)
    case 'csv-edge-list':
      return exportAsCsvEdgeList(snapshot)
    case 'csv-pair':
      return exportAsCsvPair(snapshot)
    case 'graphml':
      return exportAsGraphML(snapshot)
    case 'gexf':
      return exportAsGexf(snapshot)
  }
}

export type { ExportFormat, ExportResult, ExportSnapshot } from './types'
