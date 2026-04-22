import type { ExportFormat, ExportResult, ExportSnapshot } from './types'
import { exportAsJson } from './json'

/**
 * Dispatches to the correct serializer for the requested format.
 *
 * Async because CSV pair and anything else that needs a ZIP has to go
 * through an async library; the JSON path resolves immediately.
 */
export async function exportSnapshot(
  snapshot: ExportSnapshot,
  format: ExportFormat,
): Promise<ExportResult> {
  switch (format) {
    case 'json':
      return exportAsJson(snapshot)
    case 'csv-edge-list':
    case 'csv-pair':
    case 'graphml':
    case 'gexf':
      throw new Error(`Export format "${format}" is not implemented yet`)
  }
}

export type { ExportFormat, ExportResult, ExportSnapshot } from './types'
