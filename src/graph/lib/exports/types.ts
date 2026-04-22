import type { PropertyMeta, PropertyValue } from '../../types'

/**
 * A single node as carried through the export pipeline.
 */
export interface ExportNode {
  id: string
  x: number
  y: number
  label?: string
  /** Property values keyed by property name, in the same order as propertyMetas. */
  properties: Record<string, PropertyValue>
}

/**
 * A single edge as carried through the export pipeline. `label` is deliberately
 * omitted — Knotviz doesn't render edge labels anywhere in the UI, so we don't
 * emit them on export (see the compare between docs and parsers).
 */
export interface ExportEdge {
  source: string
  target: string
  weight?: number
}

/**
 * The complete input to any format serializer. Built once from the current
 * cosmos state + filter set by `buildExportSnapshot`, then handed to one of
 * the per-format exporters (`json.ts`, `csvPair.ts`, etc.).
 *
 * Key design points:
 * - Visible-only: nodes and edges already respect the active filter set.
 * - Positions are the CURRENT x/y from cosmos — whatever the last simulation
 *   / rotation / drag left.
 * - `propertyMetas` is the authoritative type map. Serializers use it to
 *   declare typed column headers (CSV pair) or `<key>` / `<attribute>`
 *   declarations (GraphML / GEXF). Even when a node doesn't carry a property,
 *   the key is still declared so the column is discoverable after re-import.
 */
export interface ExportSnapshot {
  nodes: ExportNode[]
  edges: ExportEdge[]
  propertyMetas: PropertyMeta[]
}

/**
 * Supported export formats. Mirrors the supported input formats.
 */
export type ExportFormat = 'json' | 'csv-edge-list' | 'csv-pair' | 'graphml' | 'gexf'

/**
 * The byte output of a serializer plus the suggested filename extension.
 *
 * For multi-file formats (CSV pair), `blob` is a ZIP containing the
 * individual files — so every format yields exactly one download.
 */
export interface ExportResult {
  blob: Blob
  /** File extension without the dot. */
  extension: string
  /** A short description of the output for UI confirmation dialogs. */
  description: string
}
