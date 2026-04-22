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
 *
 * - `label`      Full picker name. May be long (e.g. "CSV nodes + edges (ZIP)").
 * - `shortLabel` Body-button-friendly variant. Always ≤ 12 chars so the
 *                "↓ Download as <shortLabel>" string fits without wrapping.
 */
export interface ExportFormatMeta {
  format: ExportFormat
  /** Full name shown in the format picker dropdown. */
  label: string
  /** Short name shown on the main download button body. ≤ 12 chars. */
  shortLabel: string
  /** One-line description shown under the full label in the picker. */
  description: string
  /** Whether picking this format loses information. Triggers a confirm dialog. */
  lossy: boolean
  /**
   * Multi-line explanation shown in the confirm dialog when the user picks
   * a lossy format. Only read when `lossy === true`. Keep specific and
   * concrete — the user should know exactly what they're about to lose.
   */
  lossyExplanation?: string
}

export const EXPORT_FORMATS: ExportFormatMeta[] = [
  {
    format: 'json',
    label: 'JSON',
    shortLabel: 'JSON',
    description: 'Lossless round-trip.',
    lossy: false,
  },
  {
    format: 'csv-edge-list',
    label: 'CSV edge list',
    shortLabel: 'CSV (edges)',
    description: 'Edges only — per-node properties are dropped.',
    lossy: true,
    lossyExplanation:
      'CSV edge list only carries connections (source, target, weight). Per-node properties — labels, ages, tags, dates, positions — will not be in the exported file. Continue?',
  },
  {
    format: 'csv-pair',
    label: 'CSV nodes + edges (ZIP)',
    shortLabel: 'CSV (ZIP)',
    description: 'Two CSVs, zipped.',
    lossy: false,
  },
  {
    format: 'graphml',
    label: 'GraphML',
    shortLabel: 'GraphML',
    description: 'Arrays flatten to pipe-delimited strings.',
    lossy: true,
    lossyExplanation:
      'GraphML has no native list type. String[] properties will be flattened to pipe-delimited strings (e.g. "engineer|founder"). On re-import they come back as plain strings, not arrays. Continue?',
  },
  {
    format: 'gexf',
    label: 'GEXF',
    shortLabel: 'GEXF',
    description: 'Preserves arrays and positions.',
    lossy: false,
  },
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
